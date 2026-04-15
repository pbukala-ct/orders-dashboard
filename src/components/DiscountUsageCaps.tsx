import React, { useState, useEffect } from 'react';

interface DiscountCap {
  id: string;
  name: string;
  key: string | null;
  isActive: boolean;
  totalUsage: number;
  applicationCap: number;
  currencyCode: string;
  usagePercentage: number;
  campaignKey?: string | null;
  campaignName?: string | null;
  autoDisable: boolean;
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-AU').format(value);

const getUsageColor = (percentage: number): string => {
  if (percentage >= 90) return '#ef4444';
  if (percentage >= 70) return '#f59e0b';
  return '#10b981';
};

// ─── Cap Card ─────────────────────────────────────────────────────────────────
const CapCard = ({ cap }: { cap: DiscountCap }) => {
  const pct = cap.usagePercentage;
  const color = getUsageColor(pct);
  const barWidth = Math.min(pct, 100);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-2">
          <p className="font-semibold text-gray-900 truncate" title={cap.name}>
            {cap.name}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {cap.campaignName && (
              <span className="text-xs bg-[#6359ff]/10 text-[#6359ff] px-2 py-0.5 rounded-full">
                {cap.campaignName}
              </span>
            )}
            {cap.autoDisable && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                Auto-disable
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold" style={{ color }}>
            {pct.toFixed(1)}%
          </p>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              cap.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cap.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-3 my-2">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, backgroundColor: color }}
        />
      </div>

      <div className="text-sm text-gray-500">
        {formatNumber(cap.totalUsage)} used of {formatNumber(cap.applicationCap)} cap
        <span className="ml-2 text-gray-400">
          ({formatNumber(Math.max(0, cap.applicationCap - cap.totalUsage))} remaining)
        </span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DiscountUsageCaps: React.FC = () => {
  const [discountCaps, setDiscountCaps] = useState<DiscountCap[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [totalOrders, setTotalOrders] = useState<number>(0);

  useEffect(() => {
    const fetchDiscountCaps = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/discounts/caps?timeRange=${timeRange}`);
        if (!response.ok)
          throw new Error(`Failed to fetch discount caps: ${response.status} ${response.statusText}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error as string);
        if (data.bqError) console.error('BigQuery error:', data.bqError);
        setDiscountCaps(data.results || []);
        setTotalOrders(data.totalOrders || 0);
        if (data.bqError) throw new Error(`BigQuery: ${data.bqError}`);
      } catch (err) {
        console.error('Error fetching discount caps:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchDiscountCaps();
  }, [timeRange]);

  // Only show discounts that have an application cap configured
  const cappedDiscounts = [...discountCaps]
    .filter(c => c.applicationCap > 0)
    .sort((a, b) => b.usagePercentage - a.usagePercentage);

  const nearCapCount = cappedDiscounts.filter(c => c.usagePercentage >= 80).length;

  const timeRangeLabel: Record<string, string> = {
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
  };

  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Usage Cap Monitor</h3>
          <p className="text-sm text-gray-500">{timeRangeLabel[timeRange]}</p>
        </div>
        <div className="flex gap-2">
          {(['day', 'week', 'month', 'all'] as const).map(t => (
            <button
              key={t}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                timeRange === t ? 'bg-[#6359ff] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setTimeRange(t)}
            >
              {timeRangeLabel[t]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#0bbfbf] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
          <p className="font-medium">Error loading cap data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : cappedDiscounts.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No application caps configured for any discounts.</p>
          <p className="text-gray-400 text-sm mt-2">
            Set an <code>application-cap</code> custom field on a cart discount in commercetools to unlock this view.
          </p>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Orders with Discounts</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(totalOrders)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Discounts with Caps</p>
              <p className="text-2xl font-bold text-[#6359ff]">{formatNumber(cappedDiscounts.length)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Near Cap (&gt;80%)</p>
              <p className="text-2xl font-bold" style={{ color: nearCapCount > 0 ? '#f59e0b' : '#6b7280' }}>
                {formatNumber(nearCapCount)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Auto-Disable Set</p>
              <p className="text-2xl font-bold text-[#6359ff]">
                {formatNumber(discountCaps.filter(c => c.autoDisable).length)}
              </p>
            </div>
          </div>

          {/* Cap cards */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Usage Cap Status — sorted by highest usage
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cappedDiscounts.map(cap => (
                <CapCard key={cap.id} cap={cap} />
              ))}
            </div>
          </div>

          {/* Detailed table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700">Detailed Breakdown</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Discount Name</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Usage Cap</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Used Count</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Usage %</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cappedDiscounts.map((cap, index) => {
                    const color = getUsageColor(cap.usagePercentage);
                    return (
                      <tr key={cap.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{cap.name}</div>
                          {cap.campaignName && (
                            <div className="text-xs text-gray-500">Campaign: {cap.campaignName}</div>
                          )}
                          {cap.key && <div className="text-xs text-gray-500">Key: {cap.key}</div>}
                          {cap.autoDisable && (
                            <span className="text-xs mt-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded inline-block">
                              Auto-disable
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatNumber(cap.applicationCap)}</td>
                        <td className="px-4 py-3 text-right font-medium text-[#6359ff]">{formatNumber(cap.totalUsage)}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatNumber(Math.max(0, cap.applicationCap - cap.totalUsage))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full"
                                style={{ width: `${Math.min(cap.usagePercentage, 100)}%`, backgroundColor: color }}
                              />
                            </div>
                            <span className="font-medium text-sm" style={{ color }}>
                              {cap.usagePercentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              cap.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {cap.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DiscountUsageCaps;
