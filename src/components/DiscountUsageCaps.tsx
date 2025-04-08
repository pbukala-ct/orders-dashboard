/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';


interface DiscountCap {
  id: string;
  name: string;
  key: string | null;
  isActive: boolean;
  totalUsage: number; // Number of times discount has been applied
  applicationCap: number; // Maximum number of times discount can be applied
  totalSpent: number; // Budget used so far
  totalBudget: number; // Budget cap
  currencyCode: string;
  usagePercentage: number; // Percentage of application cap used
  budgetPercentage: number; // Percentage of budget cap used
  campaignKey?: string | null;
  campaignName?: string | null;
  autoDisable: boolean; // Whether to automatically disable when cap is reached
}

const DiscountUsageCaps: React.FC = () => {
  const [discountCaps, setDiscountCaps] = useState<DiscountCap[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [view, setView] = useState<'budget' | 'usage'>('usage');

  // Helper function to format currency with thousand separators
  const formatCurrency = (value: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-AU', { 
      style: 'currency', 
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Helper function to format numbers with thousand separators
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-AU').format(value);
  };

  useEffect(() => {
    const fetchDiscountCaps = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/discounts/caps?timeRange=${timeRange}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch discount caps: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Received data from API:', data); // Debugging
        
        if (data.error) {
          throw new Error(data.error as unknown as string);
        }
        
        const results = data.results || [];
        console.log(`Received ${results.length} discount caps`); // Debugging
        
        // Log if any caps have application/budget caps
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const withAppCaps = results.filter((cap: { applicationCap: number; }) => cap.applicationCap > 0);
        const withBudgetCaps = results.filter((cap: { totalBudget: number; }) => cap.totalBudget > 0);
        console.log(`Found ${withAppCaps.length} items with application caps and ${withBudgetCaps.length} with budget caps`);
        
        setDiscountCaps(results);
        setTotalOrders(data.totalOrders || 0);
      } catch (error) {
        console.error('Error fetching discount caps:', error);
        setError(error instanceof Error ? error.message : 'Unknown error fetching discount caps');
      } finally {
        setLoading(false);
      }
    };

    fetchDiscountCaps();
  }, [timeRange]);

  // Colors for different usage levels
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return '#ef4444'; // Red for near limit
    if (percentage >= 70) return '#f59e0b'; // Amber for warning
    return '#10b981'; // Green for healthy
  };

  

  // Group discounts by campaign for summary display
  const getCampaignSummary = () => {
    const campaignMap = new Map<string, {
      name: string,
      discounts: DiscountCap[],
      totalBudget: number,
      totalSpent: number,
      totalUsage: number,
      totalCap: number,
      currencyCode: string
    }>();
    
    discountCaps.forEach(discount => {
      const campaignKey = discount.campaignKey || discount.key || 'uncategorized';
      const campaignName = discount.campaignName || discount.name || 'Uncategorized Campaign';
      
      if (!campaignMap.has(campaignKey)) {
        campaignMap.set(campaignKey, {
          name: campaignName,
          discounts: [],
          totalBudget: 0,
          totalSpent: 0,
          totalUsage: 0,
          totalCap: 0,
          currencyCode: discount.currencyCode
        });
      }
      
      const campaign = campaignMap.get(campaignKey)!;
      campaign.discounts.push(discount);
      campaign.totalBudget += discount.totalBudget || 0;
      campaign.totalSpent += discount.totalSpent || 0;
      campaign.totalUsage += discount.totalUsage || 0;
      campaign.totalCap += discount.applicationCap || 0;
    });
    
    return Array.from(campaignMap.values());
  };

  // Calculate overall metrics for all caps
  const calculateOverallMetrics = () => {
    let totalBudgetCaps = 0;
    let totalBudgetUsed = 0;
    let totalUsageCaps = 0;
    let totalUsageCount = 0;
    let discountsNearBudgetCap = 0;
    let discountsNearUsageCap = 0;
    
    discountCaps.forEach(cap => {
      if (cap.totalBudget > 0) {
        totalBudgetCaps += 1;
        totalBudgetUsed += cap.budgetPercentage;
        if (cap.budgetPercentage >= 80) {
          discountsNearBudgetCap += 1;
        }
      }
      
      if (cap.applicationCap > 0) {
        totalUsageCaps += 1;
        totalUsageCount += cap.usagePercentage;
        if (cap.usagePercentage >= 80) {
          discountsNearUsageCap += 1;
        }
      }
    });
    
    return {
      avgBudgetUsage: totalBudgetCaps > 0 ? totalBudgetUsed / totalBudgetCaps : 0,
      avgUsage: totalUsageCaps > 0 ? totalUsageCount / totalUsageCaps : 0,
      discountsNearBudgetCap,
      discountsNearUsageCap,
      totalBudgetCaps,
      totalUsageCaps
    };
  };

  const metrics = calculateOverallMetrics();
  const campaignSummary = getCampaignSummary();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-t-[#0bbfbf] mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Discount Usage Caps</h3>
        
        {/* View toggle */}
        <div className="flex space-x-2">
          <div className="bg-gray-100 rounded-md p-1 flex">
            <button
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                view === 'usage' 
                  ? 'bg-[#6359ff] text-white' 
                  : 'bg-transparent text-gray-700'
              }`}
              onClick={() => setView('usage')}
            >
              Usage Caps
            </button>
            <button
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                view === 'budget' 
                  ? 'bg-[#6359ff] text-white' 
                  : 'bg-transparent text-gray-700'
              }`}
              onClick={() => setView('budget')}
            >
              Budget Caps
            </button>
          </div>
        </div>
        
        {/* Time filter controls */}
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
              timeRange === 'day' 
                ? 'bg-[#6359ff] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setTimeRange('day')}
          >
            Today
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
              timeRange === 'week' 
                ? 'bg-[#6359ff] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setTimeRange('week')}
          >
            This Week
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
              timeRange === 'month' 
                ? 'bg-[#6359ff] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setTimeRange('month')}
          >
            This Month
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
              timeRange === 'all' 
                ? 'bg-[#6359ff] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setTimeRange('all')}
          >
            All Time
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#0bbfbf] animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
          <p className="font-medium">Error loading cap data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : (view === 'usage' && metrics.totalUsageCaps === 0) ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No application caps configured for any discounts.</p>
          <p className="text-gray-400 text-sm mt-2">Configure application-cap in commercetools to limit how many times a discount can be applied.</p>
        </div>
      ) : (view === 'budget' && metrics.totalBudgetCaps === 0) ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No budget caps configured for any discounts.</p>
          <p className="text-gray-400 text-sm mt-2">Configure budget caps in commercetools to limit total spending on discounts.</p>
        </div>
      ) : discountCaps.length > 0 ? (
        <div>
          {/* Metrics Summary Card */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-l-[#6359ff]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3">
                <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                <p className="text-xl font-bold text-black">{formatNumber(totalOrders)}</p>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-500 mb-1">
                  {view === 'usage' ? 'Discounts with Usage Caps' : 'Discounts with Budget Caps'}
                </p>
                <p className="text-xl font-bold text-[#6359ff]">
                  {view === 'usage' ? formatNumber(metrics.totalUsageCaps) : formatNumber(metrics.totalBudgetCaps)}
                </p>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-500 mb-1">Period</p>
                <p className="text-xl font-bold text-[#0bbfbf]">
                  {timeRange === 'day' ? 'Today' : 
                   timeRange === 'week' ? 'This Week' : 
                   timeRange === 'month' ? 'This Month' : 'All Time'}
                </p>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-500 mb-1">
                  {view === 'usage' ? 'Avg Usage Utilization' : 'Avg Budget Utilization'}
                </p>
                <p className="text-xl font-bold" style={{ 
                  color: getUsageColor(
                    view === 'usage' ? metrics.avgUsage : metrics.avgBudgetUsage
                  )
                }}>
                  {view === 'usage' 
                    ? metrics.avgUsage.toFixed(1) 
                    : metrics.avgBudgetUsage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Alert Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    {view === 'usage' ? 'Discounts Near Usage Cap' : 'Discounts Near Budget Cap'}
                  </p>
                  <p className="text-2xl font-bold" style={{ 
                    color: getUsageColor(
                      view === 'usage' 
                        ? (metrics.discountsNearUsageCap / Math.max(1, metrics.totalUsageCaps)) * 100 
                        : (metrics.discountsNearBudgetCap / Math.max(1, metrics.totalBudgetCaps)) * 100
                    )
                  }}>
                    {view === 'usage' 
                      ? formatNumber(metrics.discountsNearUsageCap) 
                      : formatNumber(metrics.discountsNearBudgetCap)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {view === 'usage' 
                  ? `${metrics.discountsNearUsageCap} discounts have used more than 80% of their usage cap.` 
                  : `${metrics.discountsNearBudgetCap} discounts have used more than 80% of their budget cap.`}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Auto-Disable Configured</p>
                  <p className="text-2xl font-bold text-[#6359ff]">
                    {formatNumber(discountCaps.filter(cap => cap.autoDisable).length)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {discountCaps.filter(cap => cap.autoDisable).length} discounts are configured to automatically disable when their cap is reached.
              </p>
            </div>
          </div>
          
        
          
          {/* Campaign summary section */}
          {campaignSummary.length > 1 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-4 text-gray-500">Campaign Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaignSummary.map((campaign, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-l-[#6359ff]">
                    <h5 className="font-medium text-black">{campaign.name}</h5>
                    <p className="text-xs text-gray-500 mb-2">{campaign.discounts.length} discounts</p>
                    
                    {campaign.totalCap > 0 && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Usage: {formatNumber(campaign.totalUsage)} / {formatNumber(campaign.totalCap)}</span>
                          <span style={{ 
                            color: getUsageColor((campaign.totalUsage / campaign.totalCap) * 100) 
                          }}>
                            {((campaign.totalUsage / campaign.totalCap) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((campaign.totalUsage / campaign.totalCap) * 100, 100)}%`,
                              backgroundColor: getUsageColor((campaign.totalUsage / campaign.totalCap) * 100)
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {campaign.totalBudget > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Budget: {formatCurrency(campaign.totalSpent, campaign.currencyCode)} / {formatCurrency(campaign.totalBudget, campaign.currencyCode)}</span>
                          <span style={{ 
                            color: getUsageColor((campaign.totalSpent / campaign.totalBudget) * 100) 
                          }}>
                            {((campaign.totalSpent / campaign.totalBudget) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((campaign.totalSpent / campaign.totalBudget) * 100, 100)}%`,
                              backgroundColor: getUsageColor((campaign.totalSpent / campaign.totalBudget) * 100)
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Detailed table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Discount Name
                  </th>
                  {view === 'usage' ? (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Usage Cap
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Used Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Remaining
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Budget Cap
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Used Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Remaining
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Usage %
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(view === 'usage' 
                  ? discountCaps
                      .filter(cap => cap.applicationCap > 0)
                      .sort((a, b) => b.usagePercentage - a.usagePercentage)
                  : discountCaps
                      .filter(cap => cap.totalBudget > 0)
                      .sort((a, b) => b.budgetPercentage - a.budgetPercentage)
                ).map((cap, index) => (
                  <tr key={cap.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{cap.name}</div>
                      {cap.campaignName && (
                        <div className="text-xs text-gray-500">Campaign: {cap.campaignName}</div>
                      )}
                      {cap.key && (
                        <div className="text-xs text-gray-500">Key: {cap.key}</div>
                      )}
                      {cap.autoDisable && (
                        <div className="text-xs mt-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded inline-block">
                          Auto-disable
                        </div>
                      )}
                    </td>
                    {view === 'usage' ? (
                      <>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatNumber(cap.applicationCap)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#6359ff]">
                          {formatNumber(cap.totalUsage)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatNumber(Math.max(0, cap.applicationCap - cap.totalUsage))}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(cap.totalBudget, cap.currencyCode)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#6359ff]">
                          {formatCurrency(cap.totalSpent, cap.currencyCode)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(Math.max(0, cap.totalBudget - cap.totalSpent), cap.currencyCode)}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min(view === 'usage' ? cap.usagePercentage : cap.budgetPercentage, 100)}%`,
                              backgroundColor: getUsageColor(view === 'usage' ? cap.usagePercentage : cap.budgetPercentage)
                            }}
                          ></div>
                        </div>
                        <span style={{ color: getUsageColor(view === 'usage' ? cap.usagePercentage : cap.budgetPercentage) }}>
                          {(view === 'usage' ? cap.usagePercentage : cap.budgetPercentage).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cap.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {cap.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No discount cap data available.</p>
          <p className="text-gray-400 text-sm mt-2">Make sure discounts have caps configured in commercetools.</p>
        </div>
      )}
    </div>
  );
};

export default DiscountUsageCaps;