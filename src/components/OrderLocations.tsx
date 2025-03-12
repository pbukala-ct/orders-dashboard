import { useState } from 'react';
import { Order, TimeRange } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface OrderLocationsProps {
  orders: Order[];
  timeRange: TimeRange;
}

interface LocationData {
  name: string;
  value: number;
  city?: string;
}

const OrderLocations = ({ orders, timeRange }: OrderLocationsProps) => {
  const [view, setView] = useState<'state' | 'city'>('state');
  
  // Define colors for the chart
  const COLORS = ['#6359ff', '#0bbfbf', '#ffc806', '#FF8042', '#e362e3', '#59c4ff', '#ff5959', '#5ae675', '#e3c762', '#62a5e3'];
  
  // Function to process orders and extract location data
  const getLocationData = () => {
    if (!orders.length) return [];
    
    if (view === 'state') {
      // Count orders by state/country
      const stateCount: Record<string, number> = {};
      
      orders.forEach(order => {
        if (order.billingAddress?.state) {
          const state = order.billingAddress.state;
          stateCount[state] = (stateCount[state] || 0) + 1;
        }
      });
      
      // Convert to array format for chart
      return Object.entries(stateCount)
        .map(([state, count]) => ({
          name: state,
          value: count
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      // Count orders by city
      const cityCount: Record<string, number> = {};
      
      orders.forEach(order => {
        if (order.billingAddress?.city) {
          const city = order.billingAddress.city;
          cityCount[city] = (cityCount[city] || 0) + 1;
        }
      });
      
      // Convert to array format for chart
      return Object.entries(cityCount)
        .map(([city, count]) => ({
          name: city,
          value: count
        }))
        .sort((a, b) => b.value - a.value);
    }
  };
  
  const locationData = getLocationData();
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>{`${payload[0].name}: ${payload[0].value} orders`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '24px', 
      borderRadius: '8px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderTop: '4px solid #ffc806',
      height: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>Order Locations</h2>
        <div style={{ display: 'flex', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <button 
            style={{
              padding: '6px 12px',
              border: 'none',
              backgroundColor: view === 'state' ? '#6359ff' : 'transparent',
              color: view === 'state' ? 'white' : 'black',
              borderRadius: '4px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            onClick={() => setView('state')}
          >
            By State
          </button>
          <button 
            style={{
              padding: '6px 12px',
              border: 'none',
              backgroundColor: view === 'city' ? '#6359ff' : 'transparent',
              color: view === 'city' ? 'white' : 'black',
              borderRadius: '4px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            onClick={() => setView('city')}
          >
            By City
          </button>
        </div>
      </div>
      
      {locationData.length > 0 ? (
        <div style={{ display: 'flex', height: '250px' }}>
          <div style={{ width: '60%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={locationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {locationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ width: '40%', overflowY: 'auto', paddingLeft: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '8px', 
                    backgroundColor: '#f5f5f5', 
                    position: 'sticky', 
                    top: 0,
                    fontSize: '12px'
                  }}>
                    {view === 'state' ? 'State' : 'City'}
                  </th>
                  <th style={{ 
                    textAlign: 'right', 
                    padding: '8px', 
                    backgroundColor: '#f5f5f5', 
                    position: 'sticky', 
                    top: 0,
                    fontSize: '12px'
                  }}>
                    Orders
                  </th>
                </tr>
              </thead>
              <tbody>
                {locationData.map((location, index) => (
                  <tr key={location.name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ 
                      padding: '8px', 
                      display: 'flex', 
                      alignItems: 'center',
                      fontSize: '12px'
                    }}>
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: COLORS[index % COLORS.length],
                        marginRight: '8px',
                        borderRadius: '2px'
                      }} />
                      {location.name}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500, fontSize: '12px' }}>
                      {location.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '250px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px'
        }}>
          <p style={{ color: '#666' }}>No location data available</p>
        </div>
      )}
    </div>
  );
};

export default OrderLocations;