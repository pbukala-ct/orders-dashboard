import { NextResponse } from 'next/server';
import client, { getRequestBuilder } from '@/lib/commercetools';
import { subDays, startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || 'today';
  
  let startDate;
  const now = new Date();
  
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
  
  const requestBuilder = getRequestBuilder();
  const ordersRequest = requestBuilder.orders
    .where(`createdAt >= "${startDate.toISOString()}" and createdAt <= "${endOfDay(now).toISOString()}"`)
    // Remove the sort parameter or use a valid field
    // .sort('createdAt desc')
    .build();
  
  try {
    const response = await client.execute({ uri: ordersRequest, method: 'GET' });
    return NextResponse.json(response.body);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}