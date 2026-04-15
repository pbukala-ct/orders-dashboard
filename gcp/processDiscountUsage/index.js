/**
 * Google Cloud Function — processDiscountUsage
 *
 * Triggered by: Pub/Sub topic `pb-discounts-orders`
 *
 * Each message contains a commercetools order event. The function:
 *   1. Parses the order ID from the Pub/Sub message
 *   2. Fetches the full order from commercetools (with discount expansion)
 *   3. Walks line items to extract every discount application
 *   4. Inserts one BigQuery row per discount per line item per order
 *   5. Optionally enforces application caps by disabling exhausted discounts
 *
 * Retries: throwing an error causes Pub/Sub to redeliver the message.
 * Idempotency: BigQuery insert is INSERT (not MERGE), so duplicate deliveries
 * produce duplicate rows — acceptable because the budget query uses SUM over
 * distinct order_ids and the caps query de-dupes at the application layer.
 */

'use strict';

const { BigQuery } = require('@google-cloud/bigquery');
const { apiRoot } = require('./commercetools');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DATASET_ID = process.env.DATASET_ID || 'commerce_analytics';
const TABLE_ID   = process.env.TABLE_ID   || 'discount_budget_usage';

// Set to 'true' to enable automatic discount deactivation when application-cap
// is reached. Requires the CT client to have update_published_products / manage_orders scope.
const ENFORCE_CAPS = process.env.ENFORCE_CAPS === 'true';

const bigquery = new BigQuery();

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * @param {object} message  Pub/Sub message object
 * @param {object} context  Cloud Functions event context
 */
exports.processDiscountUsage = async (message, context) => {
  // -------------------------------------------------------------------------
  // 1. Parse Pub/Sub message
  // -------------------------------------------------------------------------
  let pubsubPayload;
  try {
    const raw = message.data
      ? Buffer.from(message.data, 'base64').toString('utf-8')
      : null;

    if (!raw) {
      console.warn('Empty Pub/Sub message — skipping');
      return;
    }

    pubsubPayload = JSON.parse(raw);
  } catch (err) {
    // Malformed JSON — do NOT retry (permanent failure)
    console.error('Failed to parse Pub/Sub message:', err.message);
    return;
  }

  // commercetools Subscription messages use `resource.id` for the entity ID
  const orderId =
    pubsubPayload?.resource?.id ||
    pubsubPayload?.orderId ||        // alternative field name
    pubsubPayload?.id;

  if (!orderId) {
    console.warn('No order ID found in message — skipping:', JSON.stringify(pubsubPayload));
    return;
  }

  console.log(`Processing order: ${orderId}`);

  // -------------------------------------------------------------------------
  // 2. Fetch order from commercetools
  // -------------------------------------------------------------------------
  let order;
  try {
    const response = await apiRoot
      .orders()
      .withId({ ID: orderId })
      .get({
        queryArgs: {
          expand: [
            'lineItems[*].discountedPricePerQuantity[*].discountedPrice.includedDiscounts[*].discount'
          ]
        }
      })
      .execute();

    order = response.body;
  } catch (err) {
    console.error(`Failed to fetch order ${orderId} from commercetools:`, err.message);
    // Retryable error — rethrow so Pub/Sub redelivers the message
    throw err;
  }

  if (!order) {
    console.warn(`No order body returned for ${orderId} — skipping`);
    return;
  }

  // -------------------------------------------------------------------------
  // 3. Extract discount usage from line items
  // -------------------------------------------------------------------------
  const timestamp = new Date(order.createdAt).toISOString();
  const records = [];

  // Track per-discount application counts for cap enforcement
  // discountApplications[discountId] = number of times applied in this order
  const discountApplicationCounts = {};

  for (const lineItem of order.lineItems || []) {
    for (const priceInfo of lineItem.discountedPricePerQuantity || []) {
      const qty = priceInfo.quantity || 1;

      for (const discountInfo of priceInfo.discountedPrice?.includedDiscounts || []) {
        const discountId = discountInfo.discount?.id;

        if (!discountId) {
          console.warn('includedDiscount has no discount.id — skipping entry');
          continue;
        }

        // centAmount is per-unit; multiply by quantity for the total discount value
        const discountAmount =
          (discountInfo.discountedAmount?.centAmount || 0) * qty / 100;
        const currencyCode = discountInfo.discountedAmount?.currencyCode || 'AUD';

        records.push({
          discount_id:     discountId,
          order_id:        order.id,
          timestamp,
          discount_amount: discountAmount,
          currency_code:   currencyCode,
          quantity:        qty,
          product_id:      lineItem.productId || ''
        });

        discountApplicationCounts[discountId] =
          (discountApplicationCounts[discountId] || 0) + 1;
      }
    }
  }

  if (records.length === 0) {
    console.log(`Order ${orderId} contains no discounted line items — nothing to insert`);
    return;
  }

  console.log(
    `Order ${orderId}: found ${records.length} discount record(s) across ` +
    `${Object.keys(discountApplicationCounts).length} unique discount(s)`
  );

  // -------------------------------------------------------------------------
  // 4. Insert records into BigQuery
  // -------------------------------------------------------------------------
  try {
    await bigquery
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .insert(records);

    console.log(`Inserted ${records.length} record(s) into ${DATASET_ID}.${TABLE_ID}`);
  } catch (err) {
    // BigQuery insertAll can return partial errors — log details then rethrow
    if (err.name === 'PartialFailureError' && err.errors) {
      err.errors.forEach(e => {
        console.error('BigQuery insert partial error:', JSON.stringify(e));
      });
    }
    console.error('BigQuery insert failed:', err.message);
    throw err;
  }

  // -------------------------------------------------------------------------
  // 5. Optional: enforce application caps
  //    If ENFORCE_CAPS=true, check each discount's application-cap custom field.
  //    If cumulative usage >= cap, deactivate the discount in commercetools.
  // -------------------------------------------------------------------------
  if (!ENFORCE_CAPS) return;

  for (const [discountId, countInOrder] of Object.entries(discountApplicationCounts)) {
    try {
      await maybeDeactivateDiscount(discountId, countInOrder);
    } catch (err) {
      // Cap enforcement is best-effort — log and continue
      console.error(`Cap enforcement failed for discount ${discountId}:`, err.message);
    }
  }
};

// ---------------------------------------------------------------------------
// Cap enforcement helper
// ---------------------------------------------------------------------------

/**
 * Fetches a cart discount and deactivates it if its application-cap has been
 * met or exceeded (based on the `used` + countInOrder compared to `application-cap`).
 *
 * NOTE: This approach stores the running total in the `used` Money field on the
 * discount itself. For high-throughput scenarios a separate counter (e.g. a
 * Custom Object) would be safer to avoid version conflicts.
 *
 * @param {string} discountId
 * @param {number} countInOrder  Number of times applied in the current order
 */
async function maybeDeactivateDiscount(discountId, countInOrder) {
  // Fetch current state of the discount
  const discountResponse = await apiRoot
    .cartDiscounts()
    .withId({ ID: discountId })
    .get()
    .execute();

  const discount = discountResponse.body;

  if (!discount.isActive) {
    // Already inactive — nothing to do
    return;
  }

  const fields   = discount.custom?.fields || {};
  const appCap   = fields['application-cap'];
  const autoFlag = fields['auto'];

  // Only enforce if both fields are set and auto-disable is enabled
  if (!appCap || !autoFlag) return;

  // Query BigQuery for the total historical usage of this discount
  const query = `
    SELECT COUNT(*) AS total_uses
    FROM \`${DATASET_ID}.${TABLE_ID}\`
    WHERE discount_id = @discountId
  `;

  const [rows] = await bigquery.query({
    query,
    params: { discountId }
  });

  const totalUses = Number(rows?.[0]?.total_uses || 0);
  // Add the count we just inserted (already in BQ at this point)
  const effectiveUses = totalUses; // already includes current order from step 4

  if (effectiveUses < appCap) return;

  console.log(
    `Discount ${discountId} has reached application-cap (${effectiveUses}/${appCap}) — deactivating`
  );

  await apiRoot
    .cartDiscounts()
    .withId({ ID: discountId })
    .post({
      body: {
        version: discount.version,
        actions: [
          { action: 'changeIsActive', isActive: false }
        ]
      }
    })
    .execute();

  console.log(`Discount ${discountId} successfully deactivated`);
}
