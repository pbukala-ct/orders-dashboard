import { Order, TimeRange } from '@/types';
import { useState } from 'react';

interface TopProductsProps {
  orders: Order[];
  timeRange: TimeRange;
}

interface ProductSummary {
  id: string;
  name: string;
  sku: string;
  revenue: number;
  quantitySold: number;
}

const TopProducts = ({ orders }: TopProductsProps) => {
  // State for expanding/collapsing long product names
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Process orders to get top products
  const getTopProducts = () => {
    if (!orders.length) return [];

    const productMap = new Map<string, ProductSummary>();

    // Process each order and its line items
    orders.forEach(order => {
      order.lineItems.forEach(item => {
        const productId = item.productId;
        const existingProduct = productMap.get(productId);
        
        const productPrice = item.price.value.centAmount / 100;
        const quantity = item.quantity;
        const revenue = productPrice * quantity;
        
        if (existingProduct) {
          existingProduct.revenue += revenue;
          existingProduct.quantitySold += quantity;
        } else {
          productMap.set(productId, {
            id: productId,
            name: item.name['en-AU'] || 'Unknown Product', // Assuming English locale, adjust as needed
            sku: item.variant.sku || 'N/A',
            revenue,
            quantitySold: quantity,
          });
        }
      });
    });

    // Convert to array and sort by revenue
    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Get top 10 products
  };

  const topProducts = getTopProducts();

  // Function to toggle product name expansion
  const toggleExpand = (productId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(productId)) {
      newExpandedRows.delete(productId);
    } else {
      newExpandedRows.add(productId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Function to truncate product name if needed
  const ProductName = ({ name, productId }: { name: string, productId: string }) => {
    const isExpanded = expandedRows.has(productId);
    const shouldTruncate = name.length > 40;
    
    if (!shouldTruncate) {
      return <span>{name}</span>;
    }
    
    return (
      <div>
        <div className={isExpanded ? "" : "line-clamp-2"} style={{ wordBreak: "break-word" }}>
          {name}
        </div>
        {shouldTruncate && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(productId);
            }}
            className="text-ct-teal text-xs mt-1 font-medium hover:underline"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full border-t-4 border-t-ct-violet">
      <h2 className="text-xl font-bold text-black mb-6">Top 10 Products by Revenue</h2>
      
      {topProducts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '40px' }} /> {/* No. column */}
              <col style={{ width: '40%' }} /> {/* Product name column */}
              <col style={{ width: '20%' }} /> {/* SKU column */}
              <col style={{ width: '20%' }} /> {/* Revenue column */}
              <col style={{ width: '10%' }} /> {/* Qty Sold column */}
            </colgroup>
            <thead>
              <tr className="bg-gradient-to-r from-ct-violet/20 to-ct-teal/20 rounded-lg">
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider rounded-tl-lg">
                  No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-black uppercase tracking-wider rounded-tr-lg">
                  Qty
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topProducts.map((product, index) => (
                <tr 
                  key={product.id} 
                  className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3.5 whitespace-nowrap align-top">
                    <div className="w-6 h-6 rounded-full bg-ct-violet flex items-center justify-center text-black text-sm font-medium">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-black break-words">
                    <ProductName name={product.name} productId={product.id} />
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 align-top">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium truncate block max-w-full">
                      {product.sku}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-ct-teal text-right align-top">
                    ${product.revenue.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right align-top">
                    <span className="bg-ct-yellow/10 text-black px-2 py-1 rounded font-medium">
                      {product.quantitySold}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
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
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" 
              />
            </svg>
            <p className="mt-2 text-black font-medium">No product data available for this time period</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopProducts;