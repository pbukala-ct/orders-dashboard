import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Order, TimeRange } from '@/types';

interface SalesPerformanceProps {
  orders: Order[];
  timeRange: TimeRange;
}

const SalesPerformance = ({ orders, timeRange }: SalesPerformanceProps) => {
  // Process orders into data points for the chart
  const prepareChartData = () => {
    if (!orders.length) return [];

    // Group orders by time period
    const timeData: Record<string, number> = {};
    let timeFormat = '';

    switch (timeRange) {
      case 'today':
        timeFormat = 'HH:mm';
        // Initialize hours of the day
        for (let i = 0; i < 24; i++) {
          const hour = i.toString().padStart(2, '0');
          timeData[`${hour}:00`] = 0;
        }
        break;
      case 'week':
        timeFormat = 'EEE';
        // Initialize days of the week
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
          timeData[day] = 0;
        });
        break;
      case 'month':
        timeFormat = 'dd MMM';
        // For month, we'll dynamically add days as we process orders
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
          const date = new Date(year, month, i);
          const key = format(date, 'dd MMM');
          timeData[key] = 0;
        }
        break;
    }

    // Process each order
    orders.forEach(order => {
      const orderDate = parseISO(order.createdAt);
      let key = '';
      
      switch (timeRange) {
        case 'today':
          key = format(orderDate, 'HH:00');
          break;
        case 'week':
          key = format(orderDate, 'EEE');
          break;
        case 'month':
          key = format(orderDate, 'dd MMM');
          break;
      }

      if (key in timeData) {
        const totalPrice = order.totalPrice.centAmount / 100;
        timeData[key] = (timeData[key] || 0) + totalPrice;
      }
    });

    // Convert to array format for Recharts
    return Object.entries(timeData).map(([time, amount]) => ({
      time,
      amount: parseFloat(amount.toFixed(2)),
    }));
  };

  const chartData = prepareChartData();

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-black">{label}</p>
          <p className="text-ct-violet font-bold">${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-t-ct-yellow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-black">Sales Performance</h2>
        <div className="bg-ct-yellow/10 px-3 py-1 rounded-full text-black font-medium">
          {timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This Week' : 'This Month'}
        </div>
      </div>
      
      <div className="h-72">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
              barSize={timeRange === 'month' ? 15 : 40}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="time" 
                tick={{ fill: '#000000', fontSize: 12 }} 
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={{ stroke: '#e0e0e0' }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                tick={{ fill: '#000000', fontSize: 12 }} 
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={{ stroke: '#e0e0e0' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="amount" 
                fill="#6359ff"
                radius={[4, 4, 0, 0]}
                background={{ fill: '#f8f8f8', radius: [4, 4, 0, 0] }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full rounded-lg bg-gray-50">
            <div className="text-center">
              <svg 
                className="w-12 h-12 mx-auto text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" 
                />
              </svg>
              <p className="mt-2 text-black font-medium">No sales data available for this time period</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesPerformance;