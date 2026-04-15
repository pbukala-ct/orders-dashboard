import { NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';
import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'commerce_analytics';
const TABLE_ID   = process.env.BIGQUERY_TABLE_ID   || 'discount_budget_usage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || 'all';

  console.log('Fetching discount caps data, time range:', timeRange);

  try {
    // Step 1: Get all cart discounts with their custom fields (cap configuration)
    const discountsResponse = await apiRoot
      .cartDiscounts()
      .get({
        queryArgs: { limit: 100 }
      })
      .execute();

    const discounts = discountsResponse.body.results || [];
    console.log(`Fetched ${discounts.length} discounts for reference`);

    const discountMap = new Map<string, {
      id: string;
      name: string;
      key: string | null;
      version: number;
      isActive: boolean;
      applicationCap: number;
      totalUsage: number;
      usagePercentage: number;
      currencyCode: string;
      autoDisable: boolean;
      campaignKey: string | null;
      campaignName: string | null;
    }>();

    discounts.forEach(discount => {
      const nameKey = Object.keys(discount.name)[0] || 'en-AU';
      const fields = discount.custom?.fields || {};

      discountMap.set(discount.id, {
        id: discount.id,
        name: discount.name[nameKey],
        key: discount.key || null,
        version: discount.version,
        isActive: discount.isActive,
        applicationCap: fields['application-cap'] ?? 0,
        totalUsage: 0,
        usagePercentage: 0,
        currencyCode: fields.cap?.currencyCode || 'AUD',
        autoDisable: fields['auto'] ?? false,
        campaignKey: fields['campaing-key'] ?? null,
        campaignName: fields['campaign-name'] ?? null,
      });
    });

    // Step 2: Query BigQuery for application counts per discount
    let timeFilter = '';
    const now = new Date();

    switch (timeRange) {
      case 'day':
        timeFilter = `AND DATE(timestamp) = DATE('${now.toISOString().split('T')[0]}')`;
        break;
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        timeFilter = `AND timestamp >= TIMESTAMP('${weekAgo.toISOString()}')`;
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        timeFilter = `AND timestamp >= TIMESTAMP('${monthAgo.toISOString()}')`;
        break;
      }
      // 'all' — no filter
    }

    let totalOrders = 0;
    let bqError: string | null = null;

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const fullTable = `\`${projectId}.${DATASET_ID}.${TABLE_ID}\``;

    const usageQuery = `
      SELECT
        discount_id,
        COUNT(*)                  AS total_usage,
        COUNT(DISTINCT order_id)  AS order_count
      FROM ${fullTable}
      WHERE 1=1
        ${timeFilter}
      GROUP BY discount_id
    `;

    console.log('Executing BigQuery caps query:', usageQuery);

    try {
      const [usageRows] = await bigquery.query({ query: usageQuery });
      console.log(`BigQuery returned usage data for ${usageRows.length} discounts`);

      usageRows.forEach(row => {
        if (discountMap.has(row.discount_id)) {
          const d = discountMap.get(row.discount_id)!;
          d.totalUsage = Number(row.total_usage);
        } else {
          console.warn(`BQ discount_id ${row.discount_id} not found in CT discount map`);
        }
      });

      const orderQuery = `
        SELECT COUNT(DISTINCT order_id) AS unique_order_count
        FROM ${fullTable}
        WHERE 1=1
          ${timeFilter}
      `;
      const [orderResult] = await bigquery.query({ query: orderQuery });
      totalOrders = Number(orderResult?.[0]?.unique_order_count ?? 0);

    } catch (err) {
      console.error('BigQuery query failed for caps:', err);
      bqError = err instanceof Error ? err.message : String(err);
    }

    // Step 3: Calculate usage percentages
    discountMap.forEach(d => {
      if (d.applicationCap > 0) {
        d.usagePercentage = (d.totalUsage / d.applicationCap) * 100;
      }
    });

    const results = Array.from(discountMap.values());
    console.log(`Returning cap data for ${results.length} discounts, ${totalOrders} unique orders`);

    return NextResponse.json({ results, timeRange, totalOrders, ...(bqError && { bqError }) });

  } catch (error) {
    console.error('Error fetching discount cap data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch discount cap data', details: errorMessage },
      { status: 500 }
    );
  }
}
