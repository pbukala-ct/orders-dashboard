import { NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || 'today';
  
  // Define your timezone offset in hours (AEST is UTC+10 or UTC+11 with daylight saving)
  // You may need to adjust this based on daylight saving time
  const timezoneOffsetHours = 11; // AEDT (with daylight saving)
  
  // Current date in UTC
  const now = new Date();
  
  // Calculate date ranges based on the timezone offset
  let startDate: Date;
  let endDate: Date;
  
  switch (timeRange) {
    case 'today': {
      // Create date at 00:00:00 in local timezone (which is actually the previous day in UTC)
      startDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0 - timezoneOffsetHours, // Subtract offset to get local midnight in UTC
        0, 0, 0
      ));
      
      // Create date at 23:59:59.999 in local timezone
      endDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23 - timezoneOffsetHours, // Subtract offset to get local end of day in UTC
        59, 59, 999
      ));
      break;
    }
    case 'week': {
      // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = now.getUTCDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0 = Monday

      // Calculate start of week (Monday) in local timezone
      startDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysFromMonday,
        0 - timezoneOffsetHours, // Adjust for timezone
        0, 0, 0
      ));
      
      // Calculate end of week (Sunday) in local timezone
      endDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysFromMonday + 6, // +6 days from Monday
        23 - timezoneOffsetHours, // Adjust for timezone
        59, 59, 999
      ));
      break;
    }
    case 'month': {
      // Calculate start of month in local timezone
      startDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1, // First day of month
        0 - timezoneOffsetHours, // Adjust for timezone
        0, 0, 0
      ));
      
      // Calculate end of month in local timezone
      // Get last day of month by getting day 0 of next month
      const lastDay = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        0
      )).getUTCDate();
      
      endDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        lastDay,
        23 - timezoneOffsetHours, // Adjust for timezone
        59, 59, 999
      ));
      break;
    }
    default: {
      // Same as 'today' case
      startDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0 - timezoneOffsetHours,
        0, 0, 0
      ));
      
      endDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23 - timezoneOffsetHours,
        59, 59, 999
      ));
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