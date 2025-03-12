import { NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || 'today';
  
  // Define your timezone
  const timezone = 'Australia/Sydney'; // AEST timezone
  const now = new Date();
  
  // Convert current date to your timezone
  const zonedDate = toZonedTime(now, timezone);
  
  let startDate: Date;
  let endDate: Date;
  
  switch (timeRange) {
    case 'today': {
      // Get start and end of day in your timezone
      const localStartOfDay = startOfDay(zonedDate);
      const localEndOfDay = endOfDay(zonedDate);
      
      // Format dates in UTC for the API query
      startDate = new Date(format(localStartOfDay, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone: 'UTC' }));
      endDate = new Date(format(localEndOfDay, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone: 'UTC' }));
      break;
    }
    case 'week': {
      // Calculate week start/end in local timezone
      const localStartOfWeek = startOfWeek(zonedDate, { weekStartsOn: 1 }); // Monday as first day
      const localEndOfWeek = endOfWeek(zonedDate, { weekStartsOn: 1 });
      
      // Format dates in UTC for the API query
      startDate = new Date(format(localStartOfWeek, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone: 'UTC' }));
      endDate = new Date(format(localEndOfWeek, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone: 'UTC' }));
      break;
    }
    case 'month': {
      // Calculate month start/end in local timezone
      const localStartOfMonth = startOfMonth(zonedDate);
      const localEndOfMonth = endOfMonth(zonedDate);
      
      // Format dates in UTC for the API query
      startDate = new Date(format(localStartOfMonth, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone: 'UTC' }));
      endDate = new Date(format(localEndOfMonth, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone: 'UTC' }));
      break;
    }
    default: {
      // Same as 'today' case
      const localStartOfDay = startOfDay(zonedDate);
      const localEndOfDay = endOfDay(zonedDate);
      
      startDate = new Date(format(localStartOfDay, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone: 'UTC' }));
      endDate = new Date(format(localEndOfDay, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { timeZone: 'UTC' }));
      break;
    }
  }
  
  const whereClause = `createdAt >= "${startDate.toISOString()}" and createdAt <= "${endDate.toISOString()}"`;
  
  console.log('Using where clause:', whereClause); // For debugging

  try {
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