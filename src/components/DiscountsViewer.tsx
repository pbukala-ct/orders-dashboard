/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import DiscountBudgetViewer from './DiscountBudget';

interface Discount {
  id: string;
  name: {
    [key: string]: string;
  };
  description?: {
    [key: string]: string;
  };
  value: {
    type: 'relative' | 'absolute' | 'fixed';
    permyriad?: number;
    money?: {
      centAmount: number;
      currencyCode: string;
    }[];
  };
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  key?: string;
  sortOrder?: string;
  cartPredicate?: string;
  requiresDiscountCode: boolean;
  custom?: {
    fields?: {
      cap?: {
        centAmount: number;
        currencyCode: string;
      }
    }
  };
}

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

const DiscountsViewer = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [discountUsage, setDiscountUsage] = useState<DiscountUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [totalOrdersValue, setTotalOrdersValue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'budget'>('overview');
  const [hasBudgetFeature, setHasBudgetFeature] = useState(false);

  // Helper function to format currency with thousand separators
  const formatCurrency = (value: number, currencyCode: string = 'AUD') => {
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

  // Function to get discount name in the appropriate locale
  const getDiscountName = (discount: Discount) => {
    if (!discount.name) return 'Unnamed Discount';
    // Try to get English or Australian English name, fallback to first available
    return discount.name['en-AU'] || discount.name['en'] || Object.values(discount.name)[0] || 'Unnamed Discount';
  };

  // Function to format discount value for display
  const formatDiscountValue = (discount: Discount) => {
    if (!discount.value) return 'N/A';
    
    if (discount.value.type === 'relative' && discount.value.permyriad) {
      // Convert permyriad (basis points) to percentage (10000 = 100%)
      return `${(discount.value.permyriad / 100).toFixed(0)}%`;
    } else if (discount.value.type === 'absolute' || discount.value.type === 'fixed') {
      if (discount.value.money && discount.value.money.length > 0) {
        // Format money value
        const money = discount.value.money[0];
        return formatCurrency(money.centAmount / 100, money.currencyCode);
      }
    }
    
    return 'Complex discount';
  };

  // Function to format the discount validity period
  const formatValidity = (discount: Discount) => {
    const hasStart = !!discount.validFrom;
    const hasEnd = !!discount.validUntil;
    
    if (!hasStart && !hasEnd) return 'Always valid';
    
    if (hasStart && hasEnd) {
      return `${format(parseISO(discount.validFrom!), 'dd MMM yyyy')} - ${format(parseISO(discount.validUntil!), 'dd MMM yyyy')}`;
    } else if (hasStart) {
      return `From ${format(parseISO(discount.validFrom!), 'dd MMM yyyy')}`;
    } else if (hasEnd) {
      return `Until ${format(parseISO(discount.validUntil!), 'dd MMM yyyy')}`;
    }
    
    return 'Validity unknown';
  };

  // Function to extract and format the budget cap from custom fields
  // const getBudgetCap = (discount: Discount) => {
  //   if (discount.custom?.fields?.cap) {
  //     const cap = discount.custom.fields.cap;
  //     return formatCurrency(cap.centAmount / 100, cap.currencyCode);
  //   }
  //   return 'No budget cap';
  // };

  useEffect(() => {
    const fetchDiscounts = async () => {
      setLoading(true);
      try {
        const activeParam = filter === 'all' ? '' : `?active=${filter === 'active'}`;
        const response = await fetch(`/api/discounts${activeParam}`);
        if (!response.ok) throw new Error('Failed to fetch discounts');
        
        const data = await response.json();
        const discountsData = data.results || [];
        setDiscounts(discountsData);
        
        // Check if any discount has a budget cap in custom fields
        const hasAnyBudget = discountsData.some(
          (discount: Discount) => discount.custom?.fields?.cap?.centAmount !== undefined && 
                                  discount.custom.fields.cap.centAmount > 0
        );
        
        setHasBudgetFeature(hasAnyBudget);
      } catch (error) {
        console.error('Error fetching discounts:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchDiscountUsage = async () => {
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
    };

    fetchDiscounts();
    fetchDiscountUsage();
  }, [filter]);

  // Filter buttons for active/inactive discounts
  const FilterButtons = () => (
    <div className="flex space-x-2 mb-6">
      <button
        className={`px-4 py-2 rounded-md font-medium transition ${
          filter === 'all' 
            ? 'bg-[#6359ff] text-white shadow-md' 
            : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
        }`}
        onClick={() => setFilter('all')}
      >
        All Discounts
      </button>
      <button
        className={`px-4 py-2 rounded-md font-medium transition ${
          filter === 'active' 
            ? 'bg-[#6359ff] text-white shadow-md' 
            : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
        }`}
        onClick={() => setFilter('active')}
      >
        Active
      </button>
      <button
        className={`px-4 py-2 rounded-md font-medium transition ${
          filter === 'inactive' 
            ? 'bg-[#6359ff] text-white shadow-md' 
            : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
        }`}
        onClick={() => setFilter('inactive')}
      >
        Inactive
      </button>
    </div>
  );

  // Discount status badge
  const StatusBadge = ({ active }: { active: boolean }) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      active 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800'
    }`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-md shadow-lg border border-gray-200">
          <p className="font-bold text-[#6359ff]">{data.name}</p>
          <p className="text-sm">Total Discount: {formatCurrency(data.totalAmount, data.currencyCode)}</p>
          <p className="text-sm">Orders: {formatNumber(data.uniqueOrderCount || data.orderCount)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {data.isActive ? 'Active Discount' : 'Inactive Discount'}
          </p>
        </div>
      );
    }
    return null;
  };

  // Tab navigation component
  const TabNavigation = () => (
    <div className="flex border-b border-gray-200 mb-6">
      <button
        className={`px-4 py-2 font-medium text-sm ${
          activeTab === 'overview' 
            ? 'border-b-2 border-[#6359ff] text-[#6359ff]' 
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => setActiveTab('overview')}
      >
        Discounts Overview
      </button>
      {hasBudgetFeature && (
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'budget' 
              ? 'border-b-2 border-[#6359ff] text-[#6359ff]' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('budget')}
        >
          Budget Tracking
        </button>
      )}
    </div>
  );
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Discounts Viewer</h2>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <TabNavigation />
          {activeTab === 'overview' && <FilterButtons />}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#6359ff] animate-spin"></div>
        </div>
      ) : activeTab === 'budget' && hasBudgetFeature ? (
        <DiscountBudgetViewer />
      ) : (
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Order Summary Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-t-[#6359ff]">
            <h3 className="text-xl font-bold mb-4">Order Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-black">{formatNumber(orderCount)}</p>
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
          
          {/* Active Discounts Table */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-t-[#6359ff]">
            <h3 className="text-xl font-bold mb-4">Active Discount Campaigns</h3>
            
            {discounts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Discount Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Validity Period</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {discounts.map((discount, index) => (
                      <tr key={discount.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{getDiscountName(discount)}</div>
                          {discount.key && <div className="text-xs text-gray-500">Key: {discount.key}</div>}
                          
                          {/* Display budget cap if available */}
                          {discount.custom?.fields?.cap && (
                            <div className="text-xs mt-1 bg-gray-100 rounded px-1 py-0.5 inline-block text-[#6359ff]">
                              Budget Cap: {formatCurrency(discount.custom.fields.cap.centAmount / 100, discount.custom.fields.cap.currencyCode)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#0bbfbf]">{formatDiscountValue(discount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatValidity(discount)}</td>
                        <td className="px-4 py-3"><StatusBadge active={discount.isActive} /></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{discount.sortOrder || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">No discounts found with the current filter.</p>
              </div>
            )}
          </div>
          
          {/* Discount Usage Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-t-[#ffc806]">
            <h3 className="text-xl font-bold mb-4">Discount Usage Analysis</h3>
            
            {usageLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[#ffc806] animate-spin"></div>
              </div>
            ) : discountUsage.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={discountUsage}
                    margin={{ top: 20, right: 30, left: 30, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#333333', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      label={{ 
                        value: 'Discount Campaigns', 
                        position: 'insideBottom', 
                        offset: -10,
                        fill: '#666666',
                        fontSize: 14
                      }}
                    />
                    <YAxis 
                      tick={{ fill: '#333333', fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value).replace(/[A-Z]{3}\s?/g, '$')}
                      label={{ 
                        value: 'Discount Amount ($)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' },
                        fill: '#666666',
                        fontSize: 14
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="totalAmount" name="Total Discount Amount">
                      {discountUsage.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isActive ? '#6359ff' : '#c7c7c7'}
                        />
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
          
          {/* Discount Details Table */}
          {discountUsage.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-t-[#0bbfbf]">
              <h3 className="text-xl font-bold mb-4">Discount Impact Details</h3>
              
              {/* Display budget caps when available */}
              {hasBudgetFeature && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-l-[#6359ff]">
                  <p className="text-sm font-medium">Budget Tracking Available</p>
                  <p className="text-xs text-gray-500">Some discounts have budget caps configured. Switch to the Budget Tracking tab for details.</p>
                </div>
              )}
              
              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Orders Value</p>
                  <p className="text-2xl font-bold text-black">{formatCurrency(totalOrdersValue)}</p>
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
                    {formatCurrency(discountUsage.reduce((sum, item) => sum + item.totalAmount, 0) / (orderCount || 1))}
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
                    {discountUsage
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
                            {formatCurrency((usage.totalAmount) / (usage.uniqueOrderCount || usage.orderCount || 1), usage.currencyCode)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[#ffc806]">
                            {((usage.totalAmount / totalOrdersValue) * 100).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge active={usage.isActive} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscountsViewer;