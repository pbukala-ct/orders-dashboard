// src/components/DiscountBudget.tsx
import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend
} from 'recharts';

interface DiscountBudget {
  id: string;
  name: string;
  key: string | null;
  isActive: boolean;
  totalSpent: number; // Amount of budget used
  totalBudget: number; // Total budget cap
  currencyCode: string;
  spentPercentage: number; // Calculated percentage of budget used
}

const DiscountBudgetViewer = () => {
  const [discountBudgets, setDiscountBudgets] = useState<DiscountBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [totalOrders, setTotalOrders] = useState<number>(0);

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
    const fetchDiscountBudgets = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/discounts/budget?timeRange=${timeRange}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch discount budgets: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setDiscountBudgets(data.results || []);
        setTotalOrders(data.totalOrders || 0);
      } catch (error) {
        console.error('Error fetching discount budgets:', error);
        setError(error instanceof Error ? error.message : 'Unknown error fetching discount budgets');
      } finally {
        setLoading(false);
      }
    };

    fetchDiscountBudgets();
  }, [timeRange]);

  // Colors for different budget usage levels
  const getBudgetColor = (percentage: number) => {
    if (percentage >= 90) return '#ef4444'; // Red for near limit
    if (percentage >= 70) return '#f59e0b'; // Amber for warning
    return '#10b981'; // Green for healthy
  };

  // Custom tooltip for charts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-md shadow-lg border border-gray-200">
          <p className="font-bold text-[#6359ff]">{data.name}</p>
          <p className="text-sm">Budget Cap: {formatCurrency(data.totalBudget, data.currencyCode)}</p>
          <p className="text-sm">Used: {formatCurrency(data.totalSpent, data.currencyCode)}</p>
          <p className="text-sm">Remaining: {formatCurrency(data.totalBudget - data.totalSpent, data.currencyCode)}</p>
          <p className="text-sm font-medium" style={{ color: getBudgetColor(data.spentPercentage) }}>
            {data.spentPercentage.toFixed(1)}% Used
          </p>
        </div>
      );
    }
    return null;
  };

  // Create a pie chart data
  const getPieChartData = () => {
    if (!discountBudgets.length) return [];
    
    return discountBudgets.map(budget => ({
      name: budget.name,
      value: budget.totalSpent,
      fill: getBudgetColor(budget.spentPercentage)
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-t-[#0bbfbf] mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Discount Budget Usage</h3>
        
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
          <p className="font-medium">Error loading budget data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : discountBudgets.length > 0 ? (
        <div>
          {/* Order Summary Card */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-l-[#6359ff]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3">
                <p className="text-sm text-gray-500 mb-1">Total Orders</p>
                <p className="text-xl font-bold text-black">{formatNumber(totalOrders)}</p>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-500 mb-1">Discounts with Budget</p>
                <p className="text-xl font-bold text-[#6359ff]">{formatNumber(discountBudgets.length)}</p>
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
                <p className="text-sm text-gray-500 mb-1">Budget Utilization</p>
                <p className="text-xl font-bold" style={{ 
                  color: getBudgetColor(
                    discountBudgets.reduce((sum, budget) => sum + budget.totalSpent, 0) / 
                    discountBudgets.reduce((sum, budget) => sum + budget.totalBudget, 0) * 100
                  )
                }}>
                  {(discountBudgets.reduce((sum, budget) => sum + budget.totalSpent, 0) / 
                    discountBudgets.reduce((sum, budget) => sum + budget.totalBudget, 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-l-[#0bbfbf]">
              <p className="text-sm text-gray-500 mb-1">Total Budget Allocated</p>
              <p className="text-2xl font-bold text-black">
                {formatCurrency(
                  discountBudgets.reduce((sum, item) => sum + item.totalBudget, 0),
                  discountBudgets[0].currencyCode
                )}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-l-[#6359ff]">
              <p className="text-sm text-gray-500 mb-1">Total Budget Used</p>
              <p className="text-2xl font-bold text-[#6359ff]">
                {formatCurrency(
                  discountBudgets.reduce((sum, item) => sum + item.totalSpent, 0),
                  discountBudgets[0].currencyCode
                )}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-l-[#ffc806]">
              <p className="text-sm text-gray-500 mb-1">Highest Budget Usage</p>
              <p className="text-2xl font-bold" 
                 style={{ color: getBudgetColor(Math.max(...discountBudgets.map(d => d.spentPercentage))) }}>
                {Math.max(...discountBudgets.map(d => d.spentPercentage)).toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* Charts section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Budget usage bar chart */}
            <div className="h-80">
              <h4 className="text-sm font-semibold mb-2 text-gray-500">Budget Usage by Discount</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={discountBudgets}
                  margin={{ top: 20, right: 30, left: 30, bottom: 60 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#333333', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    yAxisId="left"
                    orientation="left"
                    tick={{ fill: '#333333', fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value).replace(/[A-Z]{3}\s?/g, '$')}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="left" dataKey="totalSpent" name="Budget Used" stackId="a">
                    {discountBudgets.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getBudgetColor(entry.spentPercentage)}
                      />
                    ))}
                  </Bar>
                  <Bar yAxisId="left" dataKey="totalBudget" name="Budget Cap" stackId="b" fill="#e5e7eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Budget distribution pie chart */}
            <div className="h-80">
              <h4 className="text-sm font-semibold mb-2 text-gray-500">Budget Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getPieChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(value as number), name]}
                  />
                  <Legend formatter={(value) => <span>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Budget usage table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Discount Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Budget Cap
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Used Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Usage %
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {discountBudgets
                  .sort((a, b) => b.spentPercentage - a.spentPercentage)
                  .map((budget, index) => (
                    <tr key={budget.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{budget.name}</div>
                        {budget.key && <div className="text-xs text-gray-500">Key: {budget.key}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(budget.totalBudget, budget.currencyCode)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#6359ff]">
                        {formatCurrency(budget.totalSpent, budget.currencyCode)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(budget.totalBudget - budget.totalSpent, budget.currencyCode)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(budget.spentPercentage, 100)}%`,
                                backgroundColor: getBudgetColor(budget.spentPercentage)
                              }}
                            ></div>
                          </div>
                          <span style={{ color: getBudgetColor(budget.spentPercentage) }}>
                            {budget.spentPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          budget.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {budget.isActive ? 'Active' : 'Inactive'}
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
          <p className="text-gray-500">No discount budget data available.</p>
          <p className="text-gray-400 text-sm mt-2">Make sure discounts have budget caps configured in commercetools.</p>
        </div>
      )}
    </div>
  );
};

export default DiscountBudgetViewer;