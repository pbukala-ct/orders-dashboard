/**
 * Google Cloud Function to process Commercetools Order Events
 * This function subscribes to the Pub/Sub topic with Commercetools order events
 * and extracts discount usage data to store in BigQuery
 */

const {BigQuery} = require('@google-cloud/bigquery');
const { apiRoot } = require('./commercetools');

// Initialize BigQuery client
const bigquery = new BigQuery();

// Define the dataset and table name
const DATASET_ID = process.env.DATASET_ID || 'commerce_analytics';
const TABLE_ID = process.env.TABLE_ID || 'discount_budget_usage';

/**
 * Processes a Pub/Sub message containing a Commercetools order event
 * @param {object} message The Pub/Sub message
 * @param {object} context The event context
 */
exports.processDiscountUsage = async (message, context) => {
  try {
    // Parse the Pub/Sub message
    const pubsubMessage = message.data
      ? JSON.parse(Buffer.from(message.data, 'base64').toString())
      : null;
    
    if (!pubsubMessage || !pubsubMessage.resource || !pubsubMessage.resource.id) {
      console.log('Skipping: No valid order data in the message');
      return;
    }
    
    const orderId = pubsubMessage.resource.id;
    console.log(`Processing order event: ${orderId}`);

    // Get order details from commercetools
    const orderResponse = await apiRoot
      .orders()
      .withId({ID: orderId})
      .get()
      .execute();

    if (!orderResponse || !orderResponse.body) {
      console.log(`Unable to fetch order ${orderId}`);
      return;
    }
    
    const order = orderResponse.body;
    console.log(`Successfully fetched order ${orderId}`);
    
    // Extract order creation time
    const timestamp = new Date(order.createdAt).toISOString();

    // Process line items to extract discount usage
    const discountUsageRecords = [];

    if (order.lineItems && order.lineItems.length > 0) {
      order.lineItems.forEach(lineItem => {
        if (lineItem.discountedPricePerQuantity && lineItem.discountedPricePerQuantity.length > 0) {
          lineItem.discountedPricePerQuantity.forEach(priceInfo => {
            if (priceInfo.discountedPrice && priceInfo.discountedPrice.includedDiscounts) {
              priceInfo.discountedPrice.includedDiscounts.forEach(discountInfo => {
                // Extract discount details
                const discountId = discountInfo.discount.id;
                const discountAmount = (discountInfo.discountedAmount.centAmount * priceInfo.quantity) / 100; // Convert to dollars
                const currencyCode = discountInfo.discountedAmount.currencyCode;
                
                // Create record for BigQuery
                discountUsageRecords.push({
                  discount_id: discountId,
                  order_id: order.id,
                  timestamp: timestamp,
                  discount_amount: discountAmount,
                  currency_code: currencyCode,
                  quantity: priceInfo.quantity,
                  product_id: lineItem.productId
                });
              });
            }
          });
        }
      });
    }

    // If we found discount usage records, insert them into BigQuery
    if (discountUsageRecords.length > 0) {
      console.log(`Inserting ${discountUsageRecords.length} discount usage records to BigQuery`);
      
      // Insert data into BigQuery
      await bigquery
        .dataset(DATASET_ID)
        .table(TABLE_ID)
        .insert(discountUsageRecords);
      
      console.log('Successfully inserted discount usage records into BigQuery');
    } else {
      console.log('No discount usage found in this order');
    }
  } catch (error) {
    console.error('Error processing discount usage:', error);
    throw error; // Rethrowing to trigger a retry
  }
};