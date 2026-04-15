// src/components/DiscountBudget.tsx
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DiscountBudget {
  id: string;
  name: string;
  key: string | null;
  isActive: boolean;
  totalSpent: number;
  totalBudget: number;
  currencyCode: string;
  spentPercentage: number;
  campaignKey?: string | null;
  campaignName?: string | null;
}

const formatCurrency = (value: number, currencyCode: string = 'AUD') =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat('en-AU').format(value);

const getBudgetColor = (percentage: number): string => {
  if (percentage >= 90) return '#ef4444';
  if (percentage >= 70) return '#f59e0b';
  return '#10b981';
};

// ─── Gauge Card ───────────────────────────────────────────────────────────────
const BudgetGaugeCard = ({
  name,
  campaignName,
  totalSpent,
  totalBudget,
  currencyCode,
  spentPercentage,
  isActive,
}: DiscountBudget) => {
  const color = getBudgetColor(spentPercentage);
  const pct = Math.min(spentPercentage, 100);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <p className="font-semibold text-gray-900 truncate" title={name}>
            {name}
          </p>
          {campaignName && (
            <span className="inline-block mt-0.5 text-xs bg-[#6359ff]/10 text-[#6359ff] px-2 py-0.5 rounded-full">
              {campaignName}
            </span>
          )}
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
            isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {formatCurrency(totalSpent, currencyCode)} of {formatCurrency(totalBudget, currencyCode)}
        </span>
        <span className="font-bold" style={{ color }}>
          {spentPercentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DiscountBudgetViewer = () => {
  const [discountBudgets, setDiscountBudgets] = useState<DiscountBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [totalOrders, setTotalOrders] = useState<number>(0);

  useEffect(() => {
    const fetchDiscountBudgets = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/discounts/budget?timeRange=${timeRange}`);
        if (!response.ok)
          throw new Error(`Failed to fetch discount budgets: ${response.status} ${response.statusText}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        if (data.bqError) console.error('BigQuery error:', data.bqError);
        setDiscountBudgets(data.results || []);
        setTotalOrders(data.totalOrders || 0);
        if (data.bqError) throw new Error(`BigQuery: ${data.bqError}`);
      } catch (err) {
        console.error('Error fetching discount budgets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchDiscountBudgets();
  }, [timeRange]);

  const totalAllocated = discountBudgets.reduce((s, b) => s + b.totalBudget, 0);
  const totalUsed = discountBudgets.reduce((s, b) => s + b.totalSpent, 0);
  const overallPct = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;
  const highestPct = discountBudgets.length > 0 ? Math.max(...discountBudgets.map((d) => d.spentPercentage)) : 0;
  const currencyCode = discountBudgets[0]?.currencyCode ?? 'AUD';

  const pieData = [...discountBudgets]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map((b) => ({ name: b.name, value: b.totalSpent, fill: getBudgetColor(b.spentPercentage) }));

  const extraCount = discountBudgets.length - pieData.length;

  const timeRangeLabel: Record<string, string> = {
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Budget Tracker</h3>
          <p className="text-sm text-gray-500">{timeRangeLabel[timeRange]}</p>
        </div>
        <div className="flex gap-2">
          {(['day', 'week', 'month', 'all'] as const).map((t) => (
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
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#0bbfbf] animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
          <p className="font-medium">Error loading budget data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : discountBudgets.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No discount budget data available.</p>
          <p className="text-gray-400 text-sm mt-2">
            Make sure discounts have budget caps configured in commercetools.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(totalOrders)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Budget Allocated</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAllocated, currencyCode)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Budget Used</p>
              <p className="text-2xl font-bold text-[#6359ff]">{formatCurrency(totalUsed, currencyCode)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Budget Utilisation</p>
              <p className="text-2xl font-bold" style={{ color: getBudgetColor(overallPct) }}>
                {overallPct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Highest single utilisation banner */}
          {highestPct >= 70 && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border text-sm font-medium"
              style={{
                backgroundColor: highestPct >= 90 ? '#fef2f2' : '#fffbeb',
                borderColor: highestPct >= 90 ? '#fecaca' : '#fde68a',
                color: highestPct >= 90 ? '#b91c1c' : '#92400e',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Highest single discount at {highestPct.toFixed(1)}% utilisation — review before cap is hit.
            </div>
          )}

          {/* Gauge cards + donut chart */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Gauge card list */}
            <div className="xl:col-span-2 space-y-3">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Per-Discount Budget</h4>
              {[...discountBudgets]
                .sort((a, b) => b.spentPercentage - a.spentPercentage)
                .map((budget) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { key: _discountKey, ...rest } = budget;
                  return <BudgetGaugeCard key={budget.id} {...rest} />;
                })}
            </div>

            {/* Donut chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Budget Distribution
              </h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      label={false}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value as number, currencyCode), 'Spent']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Scrollable legend */}
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                      <span className="text-gray-700 truncate" title={entry.name}>{entry.name}</span>
                    </div>
                    <span className="text-gray-500 shrink-0 ml-2">{formatCurrency(entry.value, currencyCode)}</span>
                  </div>
                ))}
                {extraCount > 0 && (
                  <p className="text-xs text-gray-400 pt-1">…and {extraCount} more</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700">Detailed Breakdown</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Discount Name</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Budget Cap</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Used Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Usage %</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[...discountBudgets]
                    .sort((a, b) => b.spentPercentage - a.spentPercentage)
                    .map((budget, index) => (
                      <tr key={budget.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{budget.name}</div>
                          {budget.key && <div className="text-xs text-gray-500">Key: {budget.key}</div>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(budget.totalBudget, budget.currencyCode)}</td>
                        <td className="px-4 py-3 text-right font-medium text-[#6359ff]">{formatCurrency(budget.totalSpent, budget.currencyCode)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(budget.totalBudget - budget.totalSpent, budget.currencyCode)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.min(budget.spentPercentage, 100)}%`,
                                  backgroundColor: getBudgetColor(budget.spentPercentage),
                                }}
                              />
                            </div>
                            <span className="font-medium text-sm" style={{ color: getBudgetColor(budget.spentPercentage) }}>
                              {budget.spentPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              budget.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {budget.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DiscountBudgetViewer;
