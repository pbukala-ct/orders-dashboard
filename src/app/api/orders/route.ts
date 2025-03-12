import { NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || 'today';
  
  let startDate: Date;

  // Create date in Australian timezone (Sydney)
  const australianTimeZone = 'Australia/Sydney';
  const now = toZonedTime(new Date(), australianTimeZone);
  
  
  switch (timeRange) {
    case 'today':
      startDate = startOfDay(now);
      break;
    case 'week':
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      startDate = startOfMonth(now);
      break;
    default:
      startDate = startOfDay(now);
  }
  
  const whereClause = `createdAt >= "${startDate.toISOString()}" and createdAt <= "${endOfDay(now).toISOString()}"`;

  try {
    // Use the correct structure with queryArgs
    const response = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: whereClause,
          sort: ['createdAt desc'],
          limit: 100
        }
      })
      .execute();
    
    return NextResponse.json(response.body);
  } catch (error) {
    console.error('Error fetching orders:', error);
    
    // Improved error handling with more details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}