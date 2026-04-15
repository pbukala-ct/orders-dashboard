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

// Define the dataset and table name
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'commerce_analytics';
const TABLE_ID = process.env.BIGQUERY_TABLE_ID || 'discount_budget_usage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || 'all';
  
  console.log('Fetching discount budget data, time range:', timeRange);

  try {
    // Step 1: Get all active discounts with their custom fields (budget caps)
    const discountsResponse = await apiRoot
      .cartDiscounts()
      .get({
        queryArgs: {
          limit: 100,
          expand: ['custom.type'] // Expand custom fields type
        }
      })
      .execute();
    
    const discounts = discountsResponse.body.results || [];
    console.log(`Fetched ${discounts.length} discounts for reference`);
    
    // Map discount IDs to their info including budget caps
    const discountMap = new Map();
    discounts.forEach(discount => {
      const nameKey = Object.keys(discount.name)[0] || 'en-AU';
      let budgetCap = 0;
      
      // Extract budget cap from custom fields if available
      if (discount.custom?.fields?.cap) {
        budgetCap = discount.custom.fields.cap.centAmount / 100; // Convert to dollars
      }
      
      discountMap.set(discount.id, {
        name: discount.name[nameKey],
        id: discount.id,
        key: discount.key || null,
        isActive: discount.isActive,
        totalBudget: budgetCap,
        totalSpent: 0, // Will be filled with BigQuery data
        currencyCode: discount.custom?.fields?.cap?.currencyCode || 'AUD'
      });
    });

    // Step 2: Query BigQuery for usage data based on time range
    let timeFilter = '';
    const currentDate = new Date();
    
    switch (timeRange) {
      case 'day':
        // Today (in UTC, adjust if needed)
        timeFilter = `AND DATE(timestamp) = DATE('${currentDate.toISOString().split('T')[0]}')`;
        break;
      case 'week':
        // Last 7 days
        const weekAgo = new Date(currentDate);
        weekAgo.setDate(currentDate.getDate() - 7);
        timeFilter = `AND timestamp >= TIMESTAMP('${weekAgo.toISOString()}')`;
        break;
      case 'month':
        // Last 30 days
        const monthAgo = new Date(currentDate);
        monthAgo.setDate(currentDate.getDate() - 30);
        timeFilter = `AND timestamp >= TIMESTAMP('${monthAgo.toISOString()}')`;
        break;
      default:
        // All time - no filter
        timeFilter = '';
    }

    let totalOrders = 0;
    let bqError: string | null = null;

    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const fullTable = `\`${projectId}.${DATASET_ID}.${TABLE_ID}\``;

    const query = `
      SELECT
        discount_id,
        SUM(discount_amount)        AS total_spent,
        COUNT(DISTINCT order_id)    AS order_count
      FROM ${fullTable}
      WHERE 1=1
        ${timeFilter}
      GROUP BY discount_id
    `;

    console.log('Executing BigQuery query:', query);

    try {
      const [rows] = await bigquery.query({ query });
      console.log(`BigQuery returned ${rows.length} discount rows`);

      rows.forEach(row => {
        if (discountMap.has(row.discount_id)) {
          const d = discountMap.get(row.discount_id);
          d.totalSpent = Number(row.total_spent) || 0;
          d.orderCount = Number(row.order_count) || 0;
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
      const [orderCountResult] = await bigquery.query({ query: orderQuery });
      totalOrders = Number(orderCountResult?.[0]?.unique_order_count) || 0;

    } catch (error) {
      console.error('Error querying BigQuery:', error);
      bqError = error instanceof Error ? error.message : String(error);
    }

    // Calculate spent percentage for each discount
    discountMap.forEach((discount) => {
      discount.spentPercentage = discount.totalBudget > 0 
        ? (discount.totalSpent / discount.totalBudget) * 100 
        : 0;
    });

    // Convert map to array for response
    const discountBudgetsArray = Array.from(discountMap.values())
      // Filter to only include discounts with budget caps
      .filter(discount => discount.totalBudget > 0);

    console.log(`Processed discount budget data: ${discountBudgetsArray.length} discounts with budget caps`);
    console.log(`Total orders in the period: ${totalOrders}`);
    
    return NextResponse.json({
      results: discountBudgetsArray,
      timeRange,
      totalOrders,
      ...(bqError && { bqError }),
    });
  } catch (error) {
    console.error('Error fetching discount budget data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch discount budget data', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}