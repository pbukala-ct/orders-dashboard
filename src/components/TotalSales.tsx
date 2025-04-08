import { Order, TimeRange } from '@/types';

interface TotalSalesProps {
  orders: Order[];
  timeRange: TimeRange;
}

// Helper function to format currency with thousand separators
const formatCurrency = (value: number, currencyCode: string = 'AUD') => {
  return new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const TotalSales = ({ orders, timeRange }: TotalSalesProps) => {
  // Calculate total sales amount
  const calculateTotalSales = () => {
    if (!orders.length) return 0;
    
    return orders.reduce((total, order) => {
      return total + (order.totalPrice.centAmount / 100);
    }, 0);
  };

  // Calculate percentage change from previous period
  const calculatePercentageChange = () => {
    if (!orders.length) return 0;
    
    const currentTotal = calculateTotalSales();
    
    // For simplicity, we're assuming the previous period is the same length
    // In a real app, you'd fetch data for the previous period from the API
    // This is a placeholder calculation
    const previousTotal = currentTotal * 0.9; // Placeholder value
    
    if (previousTotal === 0) return 0;
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  };

  const totalSales = calculateTotalSales();
  const percentageChange = calculatePercentageChange();
  const orderCount = orders.length;

  // Helper function to get time range label
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'year':
        return 'This Year to Date';
      default:
        return 'Today';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full border-t-4 border-t-ct-teal">
      <h2 className="text-xl font-bold text-black mb-6">Total Sales</h2>
      
      <div className="mb-8">
        <div className="inline-block px-3 py-1 bg-ct-teal/10 text-ct-teal rounded-full font-medium text-sm mb-3">
          {getTimeRangeLabel()}
        </div>
        <div className="flex items-center mb-2">
          <span className="text-4xl font-bold text-black">{formatCurrency(totalSales)}</span>
          <div className={`ml-4 flex items-center ${percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span className="text-lg font-medium">{percentageChange >= 0 ? '↑' : '↓'}</span>
            <span className="ml-1 font-medium">
              {Math.abs(percentageChange).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="text-gray-500 text-sm">
          compared to previous {timeRange}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-ct-violet/10 rounded-lg p-4">
          <div className="text-ct-violet text-sm font-semibold mb-1">Total Orders</div>
          <div className="text-2xl font-bold text-black">{orderCount}</div>
        </div>
        <div className="bg-ct-yellow/10 rounded-lg p-4">
          <div className="text-ct-yellow text-sm font-semibold mb-1">Avg. Order</div>
          <div className="text-2xl font-bold text-black">
            ${orderCount > 0 ? (totalSales / orderCount).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalSales;