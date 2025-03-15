/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { apiRoot } from '@/lib/commercetools';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active');
  
  console.log('Fetching discounts from Commercetools API, active filter:', active);

  try {
    // Build the query parameters
    const queryArgs: any = {
      limit: 100,
      sort: ['lastModifiedAt desc']
    };

    // Add active filter if specified
    if (active === 'true') {
      queryArgs.where = 'isActive=true';
    } else if (active === 'false') {
      queryArgs.where = 'isActive=false';
    }

    console.log('Query arguments:', queryArgs);

    // Fetch cart discounts from Commercetools
    const response = await apiRoot
      .cartDiscounts()
      .get({
        queryArgs
      })
      .execute();
    
    console.log(`Successfully fetched ${response.body.count} discounts`);
    return NextResponse.json(response.body);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch discounts', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}