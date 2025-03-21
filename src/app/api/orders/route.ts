import { NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';

/* eslint-disable @typescript-eslint/no-unused-vars */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || 'today';
  
  // Get current time in UTC
  const now = new Date();
  
  // Define the Australian timezone - this will handle DST automatically
  const australianTZ = 'Australia/Sydney';
  
  // Function to get start of day in Australia regardless of server timezone
  const getStartOfDayAus = (date: Date): string => {
    // Create date string in format 'YYYY-MM-DD 00:00:00' in Australian timezone
    const dateStr = new Intl.DateTimeFormat('en-AU', {
      timeZone: australianTZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    } as Intl.DateTimeFormatOptions).format(date);
    
    // Parse parts from the formatted date string
    const [day, month, year] = dateStr.split('/').map(part => parseInt(part, 10));
    
    // Create a date string in ISO format with time set to start of day in Sydney
    return new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00+11:00`).toISOString();
  };
  
  // Function to get end of day in Australia regardless of server timezone
  const getEndOfDayAus = (date: Date): string => {
    // Create date string in format 'YYYY-MM-DD 23:59:59' in Australian timezone
    const dateStr = new Intl.DateTimeFormat('en-AU', {
      timeZone: australianTZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    } as Intl.DateTimeFormatOptions).format(date);
    
    // Parse parts from the formatted date string
    const [day, month, year] = dateStr.split('/').map(part => parseInt(part, 10));
    
    // Create a date string in ISO format with time set to end of day in Sydney
    return new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T23:59:59.999+11:00`).toISOString();
  };
  
  // Function to get the day of week in Australian timezone
  const getDayOfWeekAus = (date: Date): number => {
    const options: Intl.DateTimeFormatOptions = { timeZone: australianTZ, weekday: 'long' };
    const dayName = new Intl.DateTimeFormat('en-AU', options).format(date);
    
    const daysMap: Record<string, number> = {
      'Monday': 0,
      'Tuesday': 1,
      'Wednesday': 2,
      'Thursday': 3,
      'Friday': 4,
      'Saturday': 5,
      'Sunday': 6
    };
    
    // Use a safer approach to avoid TypeScript index errors
    return daysMap[dayName] ?? 0; // Default to Monday (0) if for some reason the day isn't found
  };
  
  // Function to get date from X days ago in Australian timezone
  const getDateDaysAgoAus = (date: Date, days: number): Date => {
    // Get current date parts in Australian timezone
    const dateStr = new Intl.DateTimeFormat('en-AU', {
      timeZone: australianTZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    } as Intl.DateTimeFormatOptions).format(date);
    
    // Parse parts from the formatted date string
    const [day, month, year] = dateStr.split('/').map(part => parseInt(part, 10));
    
    // Create a new date with the day adjusted
    const newDate = new Date(Date.UTC(year, month - 1, day - days));
    return newDate;
  };
  
  let startDate;
  let endDate;
  
  switch (timeRange) {
    case 'today': {
      // Today in Australian timezone
      startDate = getStartOfDayAus(now);
      endDate = getEndOfDayAus(now);
      break;
    }
    case 'week': {
      // Current day of week in Australian timezone (0 = Monday in our mapping)
      const dayOfWeek = getDayOfWeekAus(now);
      
      // Get the date for Monday (start of week)
      const monday = getDateDaysAgoAus(now, dayOfWeek);
      startDate = getStartOfDayAus(monday);
      
      // Get the date for Sunday (end of week)
      const sunday = getDateDaysAgoAus(now, dayOfWeek - 6);
      endDate = getEndOfDayAus(sunday);
      break;
    }
    case 'month': {
      // Get the current date parts in Australian timezone
      const dateStr = new Intl.DateTimeFormat('en-AU', {
        timeZone: australianTZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      } as Intl.DateTimeFormatOptions).format(now);
      
      // Parse parts from the formatted date string
      const [day, month, year] = dateStr.split('/').map(part => parseInt(part, 10));

      // First day of month
      const firstDay = new Date(Date.UTC(year, month - 1, 1));
      startDate = getStartOfDayAus(firstDay);
      
      // Last day of month
      const lastDay = new Date(Date.UTC(year, month, 0)); // Day 0 of next month = last day of current month
      endDate = getEndOfDayAus(lastDay);
      break;
    }
    default: {
      // Default to today
      startDate = getStartOfDayAus(now);
      endDate = getEndOfDayAus(now);
      break;
    }
  }
  
  const whereClause = `createdAt >= "${startDate}" and createdAt <= "${endDate}"`;
  
  console.log('Using where clause:', whereClause); // For debugging
  console.log('Start date:', startDate); // For debugging
  console.log('End date:', endDate); // For debugging

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