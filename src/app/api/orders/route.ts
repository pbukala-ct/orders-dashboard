import { NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';
import { toZonedTime, toDate } from 'date-fns-tz';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || 'today';
  
  // Define your timezone
  const timeZone = 'Australia/Sydney'; // This will handle AEST/AEDT automatically
  
  // Current date in the specified timezone
  const nowInTimeZone = toZonedTime(new Date(), timeZone);
  
  // Calculate date ranges
  let startDate: Date;
  let endDate: Date;
  
  switch (timeRange) {
    case 'today': {
      // Get start and end of day in local timezone
      const localStartOfDay = startOfDay(nowInTimeZone);
      const localEndOfDay = endOfDay(nowInTimeZone);
      
      // Convert local times to UTC for the query
      startDate = toDate(localStartOfDay, { timeZone });
      endDate = toDate(localEndOfDay, { timeZone });
      break;
    }
    case 'week': {
      // Get start and end of week in local timezone
      const localStartOfWeek = startOfWeek(nowInTimeZone, { weekStartsOn: 1 }); // 1 = Monday
      const localEndOfWeek = endOfWeek(nowInTimeZone, { weekStartsOn: 1 });
      
      // Convert local times to UTC for the query
      startDate = toDate(localStartOfWeek, { timeZone });
      endDate = toDate(localEndOfWeek, { timeZone });
      break;
    }
    case 'month': {
      // Get start and end of month in local timezone
      const localStartOfMonth = startOfMonth(nowInTimeZone);
      const localEndOfMonth = endOfMonth(nowInTimeZone);
      
      // Convert local times to UTC for the query
      startDate = toDate(localStartOfMonth, { timeZone });
      endDate = toDate(localEndOfMonth, { timeZone });
      break;
    }
    default: {
      // Same as 'today' case
      const localStartOfDay = startOfDay(nowInTimeZone);
      const localEndOfDay = endOfDay(nowInTimeZone);
      
      startDate = toDate(localStartOfDay, { timeZone });
      endDate = toDate(localEndOfDay, { timeZone });
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
    
    return NextResponse.json(response.body, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
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
