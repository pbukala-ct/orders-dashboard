import { NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || 'all';
  
  console.log('Fetching discount caps data, time range:', timeRange);

  try {
    // Step 1: Get all active discounts with their custom fields
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
    
    // Map discount IDs to their info including application caps and budget caps
    const discountMap = new Map();
    discounts.forEach(discount => {
      const nameKey = Object.keys(discount.name)[0] || 'en-AU';
      
      // Extract budget cap from custom fields
      let budgetCap = 0;
      let applicationCap = 0;
      let autoDisable = false;
      let campaignKey = null;
      let campaignName = null;
      
      // Debug log to see the structure of discount 
      console.log(`Processing discount: ${discount.id}, Custom fields:`, 
                 discount.custom && discount.custom.fields 
                   ? Object.keys(discount.custom.fields) 
                   : 'None');
      
      // Extract custom fields
      if (discount.custom?.fields) {
        const fields = discount.custom.fields;
        
        // Budget cap
        if (fields.cap) {
          budgetCap = fields.cap.centAmount / 100; // Convert to dollars
          console.log(`Discount ${discount.id} has budget cap: ${budgetCap}`);
        }
        
        // Application cap (usage limit)
        if (fields['application-cap'] !== undefined) {
          applicationCap = fields['application-cap'];
          console.log(`Discount ${discount.id} has application cap: ${applicationCap}`);
        }
        
        // Auto-disable flag
        if (fields.auto !== undefined) {
          autoDisable = fields.auto;
        }
        
        // Campaign info
        if (fields['campaing-key']) { // Note: the typo is in the field name as shown in the schema
          campaignKey = fields['campaing-key'];
        }
        
        if (fields['campaign-name']) {
          campaignName = fields['campaign-name'];
        }
      }
      
      discountMap.set(discount.id, {
        name: discount.name[nameKey],
        id: discount.id,
        version: discount.version, // Add version for cap enforcement
        key: discount.key || null,
        isActive: discount.isActive,
        totalBudget: budgetCap,
        totalSpent: 0, // Will be filled with usage data
        totalUsage: 0, // Will be filled with usage data
        applicationCap,
        usagePercentage: 0, // Will be calculated
        budgetPercentage: 0, // Will be calculated
        currencyCode: discount.custom?.fields?.cap?.currencyCode || 'AUD',
        autoDisable,
        campaignKey,
        campaignName
      });
    });

    // Step 2: Get orders with discounts based on time range
    let whereClause = 'lineItems(discountedPricePerQuantity is defined)';
    const currentDate = new Date();
    
    switch (timeRange) {
      case 'day':
        // Today
        const todayStart = new Date(currentDate);
        todayStart.setHours(0, 0, 0, 0);
        whereClause += ` and createdAt >= "${todayStart.toISOString()}"`;
        break;
      case 'week':
        // Last 7 days
        const weekAgo = new Date(currentDate);
        weekAgo.setDate(currentDate.getDate() - 7);
        whereClause += ` and createdAt >= "${weekAgo.toISOString()}"`;
        break;
      case 'month':
        // Last 30 days
        const monthAgo = new Date(currentDate);
        monthAgo.setDate(currentDate.getDate() - 30);
        whereClause += ` and createdAt >= "${monthAgo.toISOString()}"`;
        break;
      // 'all' case - no additional filter
    }

    console.log('Using where clause for orders:', whereClause);

    // Fetch orders with the constructed where clause
    const ordersResponse = await apiRoot
      .orders()
      .get({
        queryArgs: {
          limit: 500, // Fetch up to 500 orders, adjust as needed
          sort: ['createdAt desc'],
          where: whereClause,
          expand: ['lineItems[*].discountedPricePerQuantity[*].discountedPrice.includedDiscounts[*].discount']
        }
      })
      .execute();

    const orders = ordersResponse.body.results || [];
    console.log(`Fetched ${orders.length} orders with discounts for the time range`);

    // Step 3: Process orders to calculate discount usage
    const uniqueOrdersWithDiscounts = new Set();
    
    orders.forEach(order => {
      // Track unique orders with discounts
      uniqueOrdersWithDiscounts.add(order.id);
      
      // Process each line item for discount usage
      order.lineItems.forEach(lineItem => {
        if (lineItem.discountedPricePerQuantity && lineItem.discountedPricePerQuantity.length > 0) {
          lineItem.discountedPricePerQuantity.forEach(priceInfo => {
            if (priceInfo.discountedPrice && priceInfo.discountedPrice.includedDiscounts) {
              priceInfo.discountedPrice.includedDiscounts.forEach(discountInfo => {
                let discountId = '';
                
                // Get discount ID (handle either expanded or non-expanded reference)
                if (discountInfo.discount.id) {
                  discountId = discountInfo.discount.id;
                } else if (typeof discountInfo.discount === 'object' && 'id' in discountInfo.discount) {
                  discountId = discountInfo.discount.id;
                } else {
                  console.warn('Could not determine discount ID from:', discountInfo.discount);
                  return;
                }
                
                const discountAmount = discountInfo.discountedAmount.centAmount * priceInfo.quantity / 100; // Convert to dollars
                
                if (discountMap.has(discountId)) {
                  const discountData = discountMap.get(discountId);
                  
                  // Increment total spent (budget used)
                  discountData.totalSpent += discountAmount;
                  
                  // Increment usage count (how many times applied)
                  discountData.totalUsage += 1;
                } else {
                  console.warn(`Discount ${discountId} found in order but not in the active discounts map`);
                }
              });            }
          });
        }
      });
    });

    // Step 4: Calculate percentages and prepare data for response
    discountMap.forEach(discount => {
      // Calculate budget usage percentage
      if (discount.totalBudget > 0) {
        discount.budgetPercentage = (discount.totalSpent / discount.totalBudget) * 100;
      }
      
      // Calculate application usage percentage
      if (discount.applicationCap > 0) {
        discount.usagePercentage = (discount.totalUsage / discount.applicationCap) * 100;
      }
    });

    // Convert map to array for response
    const discountCapsArray = Array.from(discountMap.values());

    console.log(`Processed discount cap data: ${discountCapsArray.length} discounts`);
    
    // Generate test data if no real caps found (for development/demo purposes)
    if (process.env.NODE_ENV !== 'production' && 
        !discountCapsArray.some(cap => cap.applicationCap > 0 || cap.totalBudget > 0)) {
      console.log('No real caps found, generating sample data for development');
      
      // Take the first 3 discounts and give them fake caps
      for (let i = 0; i < Math.min(3, discountCapsArray.length); i++) {
        const discount = discountCapsArray[i];
        
        // Add budget cap data
        discount.totalBudget = 1000;
        discount.totalSpent = Math.floor(Math.random() * 800);
        discount.budgetPercentage = (discount.totalSpent / discount.totalBudget) * 100;
        
        // Add application cap data
        discount.applicationCap = 100;
        discount.totalUsage = Math.floor(Math.random() * 80);
        discount.usagePercentage = (discount.totalUsage / discount.applicationCap) * 100;
        
        // Add auto-disable for some
        discount.autoDisable = i % 2 === 0;
      }
    }
    
    return NextResponse.json({
      results: discountCapsArray,
      timeRange,
      totalOrders: uniqueOrdersWithDiscounts.size
    });
  } catch (error) {
    console.error('Error fetching discount cap data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch discount cap data', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}