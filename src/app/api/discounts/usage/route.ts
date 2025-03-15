import { NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';

export async function GET() {
  console.log('Fetching discount usage data from orders');

  try {
    // First, get all active discounts to have their names
    const discountsResponse = await apiRoot
      .cartDiscounts()
      .get({
        queryArgs: {
          limit: 100
        }
      })
      .execute();
    
    const discounts = discountsResponse.body.results || [];
    console.log(`Fetched ${discounts.length} discounts for reference`);
    
    // Map discount IDs to their names for easy lookup
    const discountMap = new Map();
    discounts.forEach(discount => {
      const nameKey = Object.keys(discount.name)[0] || 'en-AU';
      discountMap.set(discount.id, {
        name: discount.name[nameKey],
        id: discount.id,
        key: discount.key || null,
        isActive: discount.isActive
      });
    });

    // Get orders with discounts (up to the last 500 orders, adjust as needed)
    const ordersResponse = await apiRoot
      .orders()
      .get({
        queryArgs: {
          limit: 500,
          sort: ['createdAt desc'],
          where: 'lineItems(discountedPricePerQuantity is defined)',
          expand: ['lineItems[*].discountedPricePerQuantity[*].discountedPrice.includedDiscounts[*].discount']
        }
      })
      .execute();

    const orders = ordersResponse.body.results || [];
    console.log(`Fetched ${orders.length} orders with discounts`);

    // Process the orders to extract discount usage data
    const discountUsage = new Map();
    let totalOrdersValue = 0;

    orders.forEach(order => {
      // Add order total to the total orders value
      totalOrdersValue += order.totalPrice.centAmount;
      
      order.lineItems.forEach(lineItem => {
        if (lineItem.discountedPricePerQuantity && lineItem.discountedPricePerQuantity.length > 0) {
          lineItem.discountedPricePerQuantity.forEach(priceInfo => {
            if (priceInfo.discountedPrice && priceInfo.discountedPrice.includedDiscounts) {
              priceInfo.discountedPrice.includedDiscounts.forEach(discountInfo => {
                const discountId = discountInfo.discount.id;
                const discountAmount = discountInfo.discountedAmount.centAmount * priceInfo.quantity;
                
                if (!discountUsage.has(discountId)) {
                  const discountData = discountMap.get(discountId) || {
                    name: 'Unknown Discount',
                    id: discountId,
                    isActive: false
                  };
                  
                  discountUsage.set(discountId, {
                    ...discountData,
                    totalAmount: 0,
                    orderCount: 0,
                    currencyCode: discountInfo.discountedAmount.currencyCode,
                    affectedOrders: new Set()
                  });
                }
                
                const discountStats = discountUsage.get(discountId);
                discountStats.totalAmount += discountAmount;
                discountStats.orderCount += 1;
                discountStats.affectedOrders.add(order.id);
              });
            }
          });
        }
      });
    });

    // Convert the Map to an array for the response
    const discountUsageArray = Array.from(discountUsage.values()).map(usage => {
      const uniqueOrderCount = usage.affectedOrders ? usage.affectedOrders.size : 0;
      return {
        ...usage,
        uniqueOrderCount,
        totalAmount: usage.totalAmount / 100, // Convert cents to dollars
        affectedOrders: undefined // Don't send the Set in the response
      };
    });

    console.log(`Processed discount usage data: ${discountUsageArray.length} discounts found`);
    
    return NextResponse.json({
      results: discountUsageArray,
      totalOrdersValue: totalOrdersValue / 100, // Convert cents to dollars
      orderCount: orders.length
    });
  } catch (error) {
    console.error('Error fetching discount usage data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch discount usage data', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}