// src/components/Dashboard.tsx
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import SalesPerformance from './SalesPerformance';
import TotalSales from './TotalSales';
import TopProducts from './TopProducts';
import { TimeRange } from '@/types';

// Define colors directly in the component to avoid Tailwind issues
const ctColors = {
  violet: '#6359ff',
  teal: '#0bbfbf',
  yellow: '#ffc806',
  white: '#ffffff',
  earth: '#F7F2EA',
  plum: '#191741'
};

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
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
  }, [timeRange]); // Add timeRange as a dependency

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

  // Button styles with direct CSS instead of Tailwind classes
  const buttonStyle = (isActive: boolean) => ({
    padding: '10px 20px',
    borderRadius: '6px',
    fontWeight: 500,
    fontSize: '14px',
    backgroundColor: isActive ? ctColors.violet : '#ffffff',
    color: isActive ? '#ffffff' : '#000000',
    border: isActive ? 'none' : '1px solid #e5e7eb',
    boxShadow: isActive ? '0 4px 12px rgba(99, 89, 255, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    margin: '0 8px 0 0'
  });

  // Toggle button style
  const toggleButtonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 500,
    fontSize: '14px',
    backgroundColor: autoRefresh ? ctColors.teal : '#e0e0e0',
    color: autoRefresh ? '#ffffff' : '#666666',
    border: 'none',
    boxShadow: autoRefresh ? '0 2px 8px rgba(11, 191, 191, 0.2)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.5rem',
    display: 'flex',
    alignItems: 'center'
  };

  // Input style
  const inputStyle = {
    width: '60px',
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
    marginLeft: '8px',
    marginRight: '8px',
    fontSize: '14px'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#000000' }}>
          Orders Dashboard
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 600, marginRight: '1rem', color: '#000000' }}>Time Range:</span>
          <div style={{ display: 'flex' }}>
            <button
              style={buttonStyle(timeRange === 'today')}
              onClick={() => setTimeRange('today')}
            >
              Today
            </button>
            <button
              style={buttonStyle(timeRange === 'week')}
              onClick={() => setTimeRange('week')}
            >
              This Week
            </button>
            <button
              style={buttonStyle(timeRange === 'month')}
              onClick={() => setTimeRange('month')}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Section with Dashboard Status Image */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '2rem', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '1.5rem', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Welcome to Live Order Analytics</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>Your system is running optimally with 99.999% uptime.</p>
          <div style={{ 
            backgroundColor: ctColors.violet, 
            color: 'white', 
            display: 'inline-block', 
            padding: '0.5rem 1rem', 
            borderRadius: '2px', 
            fontWeight: 500 
          }}>
            Dashboard Status: Online
          </div>
          
          {/* Auto Refresh Controls */}
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={toggleAutoRefresh} 
                style={toggleButtonStyle}
              >
                Live Refresh: {autoRefresh ? 'ON' : 'OFF'}
              </button>
              
              {autoRefresh && (
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>Refresh every</span>
                  <input
                    type="number"
                    min="1"
                    value={refreshInterval}
                    onChange={handleIntervalChange}
                    style={inputStyle}
                  />
                  <span style={{ fontSize: '14px', color: '#666' }}>seconds</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Image 
            src="/images/dashboard-status.png" 
            alt="System Status" 
            width={300} 
            height={200}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '16rem' }}>
          <div style={{ 
            width: '3rem', 
            height: '3rem', 
            borderRadius: '50%', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #6359ff',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          <div style={{ gridColumn: 'span 3' }}>
            <SalesPerformance orders={orders} timeRange={timeRange} />
          </div>
          <div>
            <TotalSales orders={orders} timeRange={timeRange} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <TopProducts orders={orders} timeRange={timeRange} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;