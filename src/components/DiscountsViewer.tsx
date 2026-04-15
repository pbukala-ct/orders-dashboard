// src/components/DiscountsViewer.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CampaignGroups from './CampaignGroups';
import DiscountBudgetViewer from './DiscountBudget';
import DiscountUsageCaps from './DiscountUsageCaps';
import { Discount } from '@/types';

type Section = 'campaigns' | 'budget' | 'caps' | 'impact';

interface DiscountUsage {
  uniqueOrderCount: number;
  id: string;
  name: string;
  key: string | null;
  isActive: boolean;
  totalAmount: number;
  orderCount: number;
  currencyCode: string;
}

const formatCurrency = (value: number, currencyCode: string = 'AUD') =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat('en-AU').format(value);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ImpactTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-md shadow-lg border border-gray-200 max-w-xs">
        <p className="font-bold text-[#6359ff] break-words">{data.name}</p>
        <p className="text-sm">Total Discount: {formatCurrency(data.totalAmount, data.currencyCode)}</p>
        <p className="text-sm">Orders: {formatNumber(data.uniqueOrderCount || data.orderCount)}</p>
        <p className="text-xs text-gray-500 mt-1">{data.isActive ? 'Active' : 'Inactive'}</p>
      </div>
    );
  }
  return null;
};

// ─── Impact Analysis Section ──────────────────────────────────────────────────
const DiscountImpactSection = ({
  discountUsage,
  usageLoading,
  totalOrdersValue,
  orderCount,
}: {
  discountUsage: DiscountUsage[];
  usageLoading: boolean;
  totalOrdersValue: number;
  orderCount: number;
}) => (
  <div className="grid grid-cols-1 gap-6">
    {/* Order Summary KPIs */}
    <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-t-[#6359ff]">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Order Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(orderCount)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Total Orders Value</p>
          <p className="text-2xl font-bold text-[#6359ff]">{formatCurrency(totalOrdersValue)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Average Order Value</p>
          <p className="text-2xl font-bold text-[#0bbfbf]">
            {formatCurrency(orderCount > 0 ? totalOrdersValue / orderCount : 0)}
          </p>
        </div>
      </div>
    </div>

    {/* Discount Usage Bar Chart */}
    <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-t-[#ffc806]">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Discount Usage Analysis</h3>
      {usageLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#ffc806] animate-spin"></div>
        </div>
      ) : discountUsage.length > 0 ? (
        <div style={{ height: Math.max(280, discountUsage.length * 52) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={[...discountUsage].sort((a, b) => a.totalAmount - b.totalAmount)}
              margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={200}
                tick={{ fill: '#374151', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ImpactTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="totalAmount" name="Total Discount Amount" radius={[0, 4, 4, 0]} barSize={28}>
                {discountUsage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isActive ? '#6359ff' : '#c7c7c7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No discount usage data available.</p>
        </div>
      )}
    </div>

    {/* Discount Impact Details Table */}
    {discountUsage.length > 0 && (
      <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-t-[#0bbfbf]">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Discount Impact Details</h3>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Total Orders Value</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalOrdersValue)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Total Discounts Applied</p>
            <p className="text-2xl font-bold text-[#0bbfbf]">
              {formatCurrency(discountUsage.reduce((sum, item) => sum + item.totalAmount, 0))}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Average Discount per Order</p>
            <p className="text-2xl font-bold text-[#6359ff]">
              {formatCurrency(
                discountUsage.reduce((sum, item) => sum + item.totalAmount, 0) / (orderCount || 1)
              )}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Discount Name</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total Discount Amount</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Avg. Per Order</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">% of Order Value</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[...discountUsage]
                .sort((a, b) => b.totalAmount - a.totalAmount)
                .map((usage, index) => (
                  <tr key={usage.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{usage.name}</div>
                      {usage.key && <div className="text-xs text-gray-500">Key: {usage.key}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#0bbfbf]">
                      {formatCurrency(usage.totalAmount, usage.currencyCode)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatNumber(usage.uniqueOrderCount || usage.orderCount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(
                        usage.totalAmount / (usage.uniqueOrderCount || usage.orderCount || 1),
                        usage.currencyCode
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#ffc806]">
                      {((usage.totalAmount / totalOrdersValue) * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          usage.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {usage.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const DiscountsViewer = () => {
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get('section') as Section) || 'campaigns';
  const [section, setSection] = useState<Section>(initialSection);

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [discountUsage, setDiscountUsage] = useState<DiscountUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [totalOrdersValue, setTotalOrdersValue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [hasBudgetFeature, setHasBudgetFeature] = useState(false);
  const [hasUsageCapsFeature, setHasUsageCapsFeature] = useState(false);

  // Sync section from URL when search params change
  useEffect(() => {
    const s = searchParams.get('section') as Section | null;
    if (s) setSection(s);
  }, [searchParams]);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const activeParam = filter === 'all' ? '' : `?active=${filter === 'active'}`;
      const response = await fetch(`/api/discounts${activeParam}`);
      if (!response.ok) throw new Error('Failed to fetch discounts');
      const data = await response.json();
      const discountsData = data.results || [];
      setDiscounts(discountsData);
      setHasBudgetFeature(
        discountsData.some(
          (d: Discount) => d.custom?.fields?.cap?.centAmount !== undefined && d.custom.fields.cap.centAmount > 0
        )
      );
      setHasUsageCapsFeature(
        discountsData.some(
          (d: Discount) =>
            d.custom?.fields?.['application-cap'] !== undefined && d.custom.fields['application-cap'] > 0
        )
      );
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchDiscountUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const response = await fetch('/api/discounts/usage');
      if (!response.ok) throw new Error('Failed to fetch discount usage');
      const data = await response.json();
      setDiscountUsage(data.results || []);
      setTotalOrdersValue(data.totalOrdersValue || 0);
      setOrderCount(data.orderCount || 0);
    } catch (error) {
      console.error('Error fetching discount usage:', error);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
    fetchDiscountUsage();
  }, [fetchDiscounts, fetchDiscountUsage]);

  const sectionTitle: Record<Section, string> = {
    campaigns: 'Campaigns',
    budget: 'Budget Tracker',
    caps: 'Cap Monitor',
    impact: 'Impact Analysis',
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{sectionTitle[section]}</h2>
        <p className="text-sm text-gray-500 mt-1">Promotions Hub</p>
      </div>

      {loading && section === 'campaigns' ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#6359ff] animate-spin"></div>
        </div>
      ) : section === 'budget' ? (
        hasBudgetFeature ? (
          <DiscountBudgetViewer />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">No budget caps configured for any discounts.</p>
            <p className="text-gray-400 text-sm mt-2">Configure a budget cap in commercetools to unlock this view.</p>
          </div>
        )
      ) : section === 'caps' ? (
        hasUsageCapsFeature ? (
          <DiscountUsageCaps />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">No application caps configured for any discounts.</p>
            <p className="text-gray-400 text-sm mt-2">Configure an application-cap in commercetools to unlock this view.</p>
          </div>
        )
      ) : section === 'impact' ? (
        <DiscountImpactSection
          discountUsage={discountUsage}
          usageLoading={usageLoading}
          totalOrdersValue={totalOrdersValue}
          orderCount={orderCount}
        />
      ) : (
        /* Campaigns section */
        <div className="grid grid-cols-1 gap-6">
          {/* Filter buttons */}
          <div className="flex space-x-2">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <button
                key={f}
                className={`px-4 py-2 rounded-md font-medium transition capitalize ${
                  filter === f
                    ? 'bg-[#6359ff] text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All Discounts' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <CampaignGroups discounts={discounts} />
        </div>
      )}

      {/* Quick nav chips for feature sections */}
      {section === 'campaigns' && !loading && (hasBudgetFeature || hasUsageCapsFeature) && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-gray-600">Advanced features available:</span>
          {hasBudgetFeature && (
            <button
              onClick={() => setSection('budget')}
              className="flex items-center text-sm text-[#6359ff] hover:underline"
            >
              <span className="w-2 h-2 bg-[#6359ff] rounded-full mr-1.5"></span>Budget Tracker
            </button>
          )}
          {hasUsageCapsFeature && (
            <button
              onClick={() => setSection('caps')}
              className="flex items-center text-sm text-[#0bbfbf] hover:underline"
            >
              <span className="w-2 h-2 bg-[#0bbfbf] rounded-full mr-1.5"></span>Cap Monitor
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscountsViewer;
