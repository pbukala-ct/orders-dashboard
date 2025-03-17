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

    // Variables to track orders
    let totalOrders = 0;
    // let uniqueOrderIds = new Set();

    try {
      // Define the BigQuery SQL (adjust based on your actual schema)
      const query = `
        SELECT 
          discount_id,
          SUM(discount_amount) as total_spent,
          COUNT(DISTINCT order_id) as order_count
        FROM 
          \`${DATASET_ID}.${TABLE_ID}\`
        WHERE 
          1=1 
          ${timeFilter}
        GROUP BY 
          discount_id
      `;

      console.log('Executing BigQuery query:', query);
      
      // Execute BigQuery query
      const [rows] = await bigquery.query({ query });
      
      console.log(`Retrieved usage data for ${rows.length} discounts`);
      
      // Process the BigQuery results
      rows.forEach(row => {
        if (discountMap.has(row.discount_id)) {
          const discountInfo = discountMap.get(row.discount_id);
          discountInfo.totalSpent = row.total_spent;
          discountInfo.orderCount = row.order_count || 0;
          
          // Add to total orders (will be deduplicated with Set)
          totalOrders += row.order_count || 0;
        }
      });

      // Get a count of unique orders from a separate query
      const orderQuery = `
        SELECT 
          COUNT(DISTINCT order_id) as unique_order_count
        FROM 
          \`${DATASET_ID}.${TABLE_ID}\`
        WHERE 
          1=1 
          ${timeFilter}
      `;
      
      const [orderCountResult] = await bigquery.query({ query: orderQuery });
      if (orderCountResult && orderCountResult.length > 0) {
        totalOrders = orderCountResult[0].unique_order_count || 0;
      }
      
    } catch (error) {
      console.error('Error querying BigQuery:', error);
      
      // If BigQuery query fails, continue with simulated data for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('Using simulated data for development');
        
        // Simulate usage data for development/testing
        discountMap.forEach((discount) => {
          // Only generate random usage for discounts with budget caps
          if (discount.totalBudget > 0) {
            // Generate random usage between 10% and 95% of the budget
            const randomPercentage = Math.random() * 0.85 + 0.1;
            discount.totalSpent = discount.totalBudget * randomPercentage;
            discount.orderCount = Math.floor(Math.random() * 50) + 5; // Random order count between 5 and 54
          }
        });
        
        // Simulate total orders for development
        totalOrders = Math.floor(Math.random() * 200) + 50; // Random number between 50 and 249
      }
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
      totalOrders
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