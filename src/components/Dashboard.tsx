/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import SalesPerformance from './SalesPerformance';
import TotalSales from './TotalSales';
import TopProducts from './TopProducts';
import { TimeRange } from '@/types';
import OrderLocations from './OrderLocations';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(3);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.results || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchOrders();
    
    // Set up auto-refresh only if enabled
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      intervalId = setInterval(fetchOrders, refreshInterval * 1000);
    }
    
    // Clean up the interval on component unmount or when dependencies change
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timeRange, autoRefresh, refreshInterval, fetchOrders]);

  // Toggle auto-refresh function
  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  // Handle refresh interval change
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setRefreshInterval(value);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-6">Live Orders View</h2>
        
        <div className="flex items-center mb-6">
          <span className="font-semibold mr-4 text-black">Time Range:</span>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-4 py-2 rounded-md font-medium transition ${
                timeRange === 'today' 
                  ? 'bg-[#6359ff] text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
              }`}
              style={timeRange === 'today' ? { backgroundColor: '#6359ff', color: 'white' } : {}}
              onClick={() => setTimeRange('today')}
            >
              Today
            </button>
            <button
              className={`px-4 py-2 rounded-md font-medium transition ${
                timeRange === 'week' 
                  ? 'bg-[#6359ff] text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
              }`}
              style={timeRange === 'week' ? { backgroundColor: '#6359ff', color: 'white' } : {}}
              onClick={() => setTimeRange('week')}
            >
              This Week
            </button>
            <button
              className={`px-4 py-2 rounded-md font-medium transition ${
                timeRange === 'month' 
                  ? 'bg-[#6359ff] text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
              }`}
              style={timeRange === 'month' ? { backgroundColor: '#6359ff', color: 'white' } : {}}
              onClick={() => setTimeRange('month')}
            >
              This Month
            </button>
            <button
              className={`px-4 py-2 rounded-md font-medium transition ${
                timeRange === 'year' 
                  ? 'bg-[#6359ff] text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-black hover:bg-gray-50'
              }`}
              style={timeRange === 'year' ? { backgroundColor: '#6359ff', color: 'white' } : {}}
              onClick={() => setTimeRange('year')}
            >
              This Year to Date
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Section with Dashboard Status Image */}
      <div className="flex items-center mb-8 bg-white rounded-lg p-6 shadow-sm">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">Welcome to Live Order Analytics</h3>
          <p className="text-gray-600 mb-4">Your system is running optimally with 99.999% uptime.</p>
          <div className="bg-[#6359ff] text-white inline-block px-4 py-2 rounded font-medium">
            Dashboard Status: Online
          </div>
          
          {/* Auto Refresh Controls */}
          <div className="mt-4">
            <div className="flex items-center">
              <button 
                onClick={toggleAutoRefresh} 
                className={`flex items-center px-4 py-2 rounded font-medium transition ${
                  autoRefresh 
                    ? 'bg-[#0bbfbf] text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Live Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </button>
              
              {autoRefresh && (
                <div className="flex items-center ml-4">
                  <span className="text-sm text-gray-600">Refresh every</span>
                  <input
                    type="number"
                    min="1"
                    value={refreshInterval}
                    onChange={handleIntervalChange}
                    className="mx-2 w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm text-gray-600">seconds</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 flex justify-end">
          <Image 
            src="/images/dashboard-status.png" 
            alt="System Status" 
            width={300} 
            height={200}
            className="max-w-full h-auto"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-ct-violet animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <SalesPerformance orders={orders} timeRange={timeRange} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <TotalSales orders={orders} timeRange={timeRange} />
            </div>
            <div className="lg:col-span-2">
              <TopProducts orders={orders} timeRange={timeRange} />
            </div>
          </div>
          
          <div>
            <OrderLocations orders={orders} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;