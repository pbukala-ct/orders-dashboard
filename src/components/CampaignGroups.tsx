/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { ChevronDown, ChevronUp, Calendar, Check, Clock, AlertCircle, Package, Tag, 
    Users, Info, DollarSign, KeyIcon } from 'lucide-react';

import { Discount } from '@/types';


interface Campaign {
  id: string;
  name: string;
  discounts: Discount[];
  validFrom: string | null;
  validUntil: string | null;
  status: 'active' | 'upcoming' | 'expired' | 'ongoing' | 'mixed' | 'unknown';
  targetGroups: Set<string>;
  targetCategories: Set<string>;
}

interface CampaignGroupsProps {
  discounts: Discount[];
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
  // First check custom fields for start/end dates
  const customStartDate = discount.custom?.fields?.['start-date'];
  const customEndDate = discount.custom?.fields?.['end-date'];
  
  // Then fall back to validFrom/validUntil
  const startDate = customStartDate || discount.validFrom;
  const endDate = customEndDate || discount.validUntil;
  
  const hasStart = !!startDate;
  const hasEnd = !!endDate;
  
  if (!hasStart && !hasEnd) return 'Always valid';
  
  if (hasStart && hasEnd) {
    return `${format(parseISO(startDate!), 'dd MMM yyyy')} - ${format(parseISO(endDate!), 'dd MMM yyyy')}`;
  } else if (hasStart) {
    return `From ${format(parseISO(startDate!), 'dd MMM yyyy')}`;
  } else if (hasEnd) {
    return `Until ${format(parseISO(endDate!), 'dd MMM yyyy')}`;
  }
  
  return 'Validity unknown';
};

// Modernized status badge with commercetools colors
const StatusBadge = ({ active }: { active: boolean }) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      active 
        ? 'bg-[#0bbfbf] text-white' 
        : 'bg-gray-500 text-white'
    }`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );

// Helper functions for working with dates and campaigns
const extractCampaignInfo = (discounts: Discount[]): Campaign[] => {
    // Group discounts by campaign key from custom fields
    const campaignMap = new Map<string, Campaign>();
    
    discounts.forEach(discount => {
      // Extract campaign key and name from custom fields
      // Note: Using the exact field names from your structure, including the typo in 'campaing-key'
      const campaignKey = discount.custom?.fields?.['campaing-key'] || 'uncategorized';
      let campaignName = discount.custom?.fields?.['campaign-name'] || 'Uncategorized Campaign';
      
      // Format campaign name if it's in kebab/snake case and no explicit name is provided
      if (!discount.custom?.fields?.['campaign-name'] && campaignKey !== 'uncategorized') {
        campaignName = formatCampaignName(campaignKey);
      }
      
      if (!campaignMap.has(campaignKey)) {
        campaignMap.set(campaignKey, {
          id: campaignKey,
          name: campaignName,
          discounts: [],
          validFrom: null,
          validUntil: null,
          status: 'unknown',
          targetGroups: new Set<string>(),
          targetCategories: new Set<string>()
        });
      }
      
      const campaign = campaignMap.get(campaignKey)!;
      campaign.discounts.push(discount);
      
      // Add target groups and categories if available
      // You might need to adjust these fields based on your actual data structure
    //   if (discount.custom?.fields?.targetGroup) {
    //     campaign.targetGroups.add(discount.custom.fields.targetGroup);
    //   }
      
    //   if (discount.custom?.fields?.targetCategory) {
    //     campaign.targetCategories.add(discount.custom.fields.targetCategory);
    //   }
      
      // Update campaign dates based on discounts
      // Using your custom fields structure for start-date and end-date
      const discountStartDate = discount.custom?.fields?.['start-date'] || discount.validFrom;
      const discountEndDate = discount.custom?.fields?.['end-date'] || discount.validUntil;
      
      if (discountStartDate && (!campaign.validFrom || new Date(discountStartDate) < new Date(campaign.validFrom))) {
        campaign.validFrom = discountStartDate;
      }
      
      if (discountEndDate && (!campaign.validUntil || new Date(discountEndDate) > new Date(campaign.validUntil))) {
        campaign.validUntil = discountEndDate;
      }
    });
  
  // Calculate campaign status and sort discounts
  const now = new Date();
  campaignMap.forEach(campaign => {
    // Determine campaign status
    if (campaign.validFrom && campaign.validUntil) {
      const startDate = new Date(campaign.validFrom);
      const endDate = new Date(campaign.validUntil);
      
      if (now < startDate) {
        campaign.status = 'upcoming';
      } else if (now > endDate) {
        campaign.status = 'expired';
      } else {
        campaign.status = 'active';
      }
    } else if (campaign.validFrom) {
      campaign.status = new Date(campaign.validFrom) > now ? 'upcoming' : 'active';
    } else if (campaign.validUntil) {
      campaign.status = new Date(campaign.validUntil) < now ? 'expired' : 'active';
    } else {
      campaign.status = 'ongoing'; // No dates specified
    }
    
    // Check if any discounts are active even if campaign dates suggest otherwise
    const hasActiveDiscounts = campaign.discounts.some(d => d.isActive);
    if (hasActiveDiscounts && (campaign.status === 'expired' || campaign.status === 'upcoming')) {
      campaign.status = 'mixed';
    }
    
    // Sort discounts by isActive (active first) then by name
    campaign.discounts.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      
      // Next sort by application cap if available in custom fields
      const capA = a.custom?.fields?.['application-cap'] || 0;
      const capB = b.custom?.fields?.['application-cap'] || 0;
      if (capA !== capB) return capB - capA; // Higher cap first
      
      const nameA = getDiscountName(a).toLowerCase();
      const nameB = getDiscountName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });
  
    // Convert to array and sort by status and dates
    return Array.from(campaignMap.values()).sort((a, b) => {
        // Sort by status priority: active > upcoming > ongoing > expired > mixed
        const statusPriority = { active: 0, upcoming: 1, ongoing: 2, mixed: 3, expired: 4, unknown: 5 };
        if (statusPriority[a.status] !== statusPriority[b.status]) {
          return statusPriority[a.status] - statusPriority[b.status];
        }
        
        // If same status, sort by start date (most recent first for active, earliest first for upcoming)
        if (a.validFrom && b.validFrom) {
          if (a.status === 'upcoming') {
            return new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime();
          } else {
            return new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime();
          }
        }
        
        // If one has a start date and the other doesn't, prioritize the one with a date
        if (a.validFrom) return -1;
        if (b.validFrom) return 1;
        
        // Otherwise sort alphabetically
        return a.name.localeCompare(b.name);
      });
    };

// Format campaign name for display (convert kebab-case or snake_case to Title Case)
const formatCampaignName = (campaignKey: string) => {
  return campaignKey
    .replace(/[-_]/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};



// Get campaign status icon component with commercetools colors
const CampaignStatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'active':
        return <Check size={16} className="text-[#0bbfbf]" />;
      case 'upcoming':
        return <Clock size={16} className="text-[#6359ff]" />;
      case 'expired':
        return <AlertCircle size={16} className="text-gray-600" />;
      case 'ongoing':
        return <Check size={16} className="text-[#6359ff]" />;
      case 'mixed':
        return <AlertCircle size={16} className="text-[#ffc806]" />;
      default:
        return <AlertCircle size={16} className="text-gray-600" />;
    }
  };


  
  // Improved Timeline bar component with better date spacing
const TimelineBar = ({ validFrom, validUntil }: { validFrom: string | null, validUntil: string | null }) => {
    const now = new Date();
    const start = validFrom ? new Date(validFrom) : null;
    const end = validUntil ? new Date(validUntil) : null;
    
    // If no dates, show a different style
    if (!start && !end) {
      return (
        <div className="flex items-center h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-full bg-purple-300 rounded-full"></div>
        </div>
      );
    }
    
    // Calculate width percentages for the timeline
    // We'll use a 180-day window centered around today for visualization
    const TOTAL_DAYS = 180;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - Math.floor(TOTAL_DAYS / 3)); // 1/3 before today, 2/3 after
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + TOTAL_DAYS);
    
    const totalRange = endDate.getTime() - startDate.getTime();
    
    // Calculate left position (start of colored bar)
    let leftPos = 0;
    if (start && start > startDate) {
      leftPos = ((start.getTime() - startDate.getTime()) / totalRange) * 100;
    }
    
    // Calculate right position (end of colored bar)
    let rightPos = 100;
    if (end && end < endDate) {
      rightPos = ((end.getTime() - startDate.getTime()) / totalRange) * 100;
    }
    
    // Width of the colored bar
    const width = Math.max(0, rightPos - leftPos);
    
    // Determine bar color based on campaign status
    let barColor = "#6359ff"; // commercetools violet
    if (start && end) {
      if (now < start) {
        barColor = "#0bbfbf"; // commercetools teal (upcoming)
      } else if (now > end) {
        barColor = "#777777"; // gray (expired)
      } else {
        barColor = "#0bbfbf"; // commercetools teal (active)
      }
    } else if (start && now < start) {
      barColor = "#0bbfbf"; // commercetools teal (upcoming)
    } else if (end && now > end) {
      barColor = "#777777"; // gray (expired)
    }
    
    // Calculate today marker position
    const todayPos = ((now.getTime() - startDate.getTime()) / totalRange) * 100;
    
    // Format dates - use shorter format to avoid overlap
    const formatShortDate = (date: Date) => {
      return format(date, 'dd MMM');
    };
  
    // Determine available horizontal space for date labels
    // Adjust label positions to avoid overlap with timeline markers
    const startLabelPos = Math.max(0, leftPos - 5);
    const endLabelPos = Math.min(100, rightPos + 5);
    const todayLabelPos = Math.max(5, Math.min(95, todayPos));
    
    return (
      <div className="relative pb-6 pt-2"> {/* Added more padding bottom for date labels */}
        <div className="flex items-center h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          {/* Colored active period */}
          <div 
            className="absolute h-2 rounded-full"
            style={{ 
              left: `${leftPos}%`, 
              width: `${width}%`,
              backgroundColor: barColor
            }}
          ></div>
          
          {/* Today marker */}
          <div 
            className="absolute w-0.5 h-4 bg-red-500 z-10" 
            style={{ left: `${todayPos}%`, top: '-1px' }}
          ></div>
        </div>
        
        {/* Timeline labels with adjusted positions */}
        {start && (
          <div 
            className="absolute text-xs font-medium text-gray-600"
            style={{ 
              left: `${startLabelPos}%`, 
              bottom: '0',
              transform: 'translateX(-50%)'
            }}
          >
            {formatShortDate(start)}
          </div>
        )}
        
        {/* Today label */}
        <div 
          className="absolute text-xs font-medium text-red-500"
          style={{ 
            left: `${todayLabelPos}%`, 
            bottom: '0',
            transform: 'translateX(-50%)'
          }}
        >
          Today
        </div>
        
        {end && (
          <div 
            className="absolute text-xs font-medium text-gray-600"
            style={{ 
              left: `${endLabelPos}%`, 
              bottom: '0',
              transform: 'translateX(-50%)'
            }}
          >
            {formatShortDate(end)}
          </div>
        )}
      </div>
    );
  };
  


// Campaign card component with commercetools styling
const CampaignCard = ({ campaign, isExpanded, onToggle }: { 
    campaign: Campaign, 
    isExpanded: boolean, 
    onToggle: () => void 
  }) => {
   
    
    // Format date for display
    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'N/A';
      try {
        const date = parseISO(dateString);
        if (!isValid(date)) return 'Invalid Date';
        return format(date, 'dd MMM yyyy');
      } catch (error) {
        return 'Invalid Date ' + error;
      }
    };
  
    // Get appropriate status badge color (using commercetools colors)
    const getStatusBadgeColor = (status: string) => {
      switch (status) {
        case 'active': return 'bg-[#0bbfbf]'; // teal
        case 'upcoming': return 'bg-[#6359ff]'; // violet
        case 'expired': return 'bg-gray-500';
        case 'ongoing': return 'bg-[#6359ff]'; // violet
        case 'mixed': return 'bg-[#ffc806]'; // yellow
        default: return 'bg-gray-500';
      }
    };
  
    // Get status bar color
    const getStatusBarColor = (status: string) => {
      switch (status) {
        case 'active': return 'bg-[#0bbfbf]'; // teal
        case 'upcoming': return 'bg-[#6359ff]'; // violet
        case 'expired': return 'bg-gray-500';
        case 'ongoing': return 'bg-[#6359ff]'; // violet
        case 'mixed': return 'bg-[#ffc806]'; // yellow
        default: return 'bg-gray-500';
      }
    };
    
    return (
      <div className={`
        bg-white rounded-lg overflow-hidden transition-all duration-200
        ${isExpanded ? 'shadow-md' : 'shadow-sm border border-gray-200'}
      `}>
        {/* Campaign header */}
        <div 
          className={`
            cursor-pointer transition-all duration-200 
            ${isExpanded 
              ? 'border-b border-gray-200' 
              : 'hover:bg-gray-50'}
          `}
          onClick={onToggle}
        >
          <div className="flex items-start p-4">
            <div className={`w-1.5 h-full self-stretch mr-3 rounded-sm ${getStatusBarColor(campaign.status)}`}></div>
            
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium text-lg text-gray-900">{campaign.name}</h4>
                <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusBadgeColor(campaign.status)}`}>
                  <div className="flex items-center">
                    <CampaignStatusIcon status={campaign.status} />
                    <span className="ml-1 capitalize">{campaign.status}</span>
                  </div>
                </span>
                <span className="bg-[#6359ff] text-white px-3 py-1 rounded-full text-xs font-medium">
                  {campaign.discounts.length} discount{campaign.discounts.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-500 mt-2">
                <Calendar size={14} className="mr-1 text-gray-400" />
                {campaign.validFrom || campaign.validUntil ? (
                  <span>
                    {formatDate(campaign.validFrom)} - {formatDate(campaign.validUntil)}
                  </span>
                ) : (
                  <span>No date range specified</span>
                )}
              </div>
              
              <div className="mt-4 mb-2">
                <TimelineBar validFrom={campaign.validFrom} validUntil={campaign.validUntil} />
              </div>
              
              {(campaign.targetGroups.size > 0 || campaign.targetCategories.size > 0) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {Array.from(campaign.targetGroups).map(group => (
                    <span key={group} className="flex items-center text-xs bg-[#ffc806]/10 text-[#ffc806] px-2 py-0.5 rounded-full">
                      <Users size={12} className="mr-1" /> {group}
                    </span>
                  ))}
                  
                  {Array.from(campaign.targetCategories).map(category => (
                    <span key={category} className="flex items-center text-xs bg-[#6359ff]/10 text-[#6359ff] px-2 py-0.5 rounded-full">
                      <Tag size={12} className="mr-1" /> {category}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <button className={`
              p-2 rounded-full transition-colors self-start ml-2
              ${isExpanded 
                ? 'bg-[#6359ff] text-white' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}
            `}>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
        
        {/* Campaign discounts (expandable) */}
        {isExpanded && (
          <div className="bg-white p-4">
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Discount Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Validity Period</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {campaign.discounts.map((discount, index) => (
                    <tr key={discount.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{getDiscountName(discount)}</div>
                        {discount.key && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <KeyIcon size={10} className="mr-1" /> {discount.key}
                          </div>
                        )}
                        
                        {/* Display budget cap if available */}
                        {discount.custom?.fields?.cap && (
                          <div className="text-xs mt-1 bg-[#6359ff]/10 text-[#6359ff] px-2 py-1 rounded-full inline-flex items-center">
                            <DollarSign size={10} className="mr-1" />
                            Budget Cap: {formatCurrency(discount.custom.fields.cap.centAmount / 100, discount.custom.fields.cap.currencyCode)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#0bbfbf] px-2 py-1 bg-[#0bbfbf]/10 rounded-full inline-block">
                          {formatDiscountValue(discount)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatValidity(discount)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge active={discount.isActive} />
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
  };


// Main Campaign Groups Component with modernized UI
// Main Campaign Groups Component with commercetools styling
const CampaignGroups: React.FC<CampaignGroupsProps> = ({ discounts }) => {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [expandAll, setExpandAll] = useState(false);
  
  const campaigns = extractCampaignInfo(discounts);
  
  // Filter campaigns based on selected filter
  const filteredCampaigns = campaigns.filter(campaign => {
    if (campaignFilter === 'all') return true;
    if (campaignFilter === 'active') return campaign.status === 'active' || campaign.status === 'mixed' || campaign.status === 'ongoing';
    if (campaignFilter === 'upcoming') return campaign.status === 'upcoming';
    if (campaignFilter === 'expired') return campaign.status === 'expired';
    if (campaignFilter === 'mixed') return campaign.status === 'mixed';
    return true;
  });
  
  // Toggle campaign expansion
  const toggleCampaign = (id: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCampaigns(newExpanded);
  };
  
  // Toggle expand all campaigns
  const toggleExpandAll = () => {
    if (expandAll) {
      // Collapse all
      setExpandedCampaigns(new Set());
    } else {
      // Expand all
      const allIds = filteredCampaigns.map(c => c.id);
      setExpandedCampaigns(new Set(allIds));
    }
    setExpandAll(!expandAll);
  };
  
  // Get counts by status for summary
  const getStatusCounts = () => {
    const counts = {
      active: 0,
      upcoming: 0,
      expired: 0,
      ongoing: 0,
      mixed: 0
    };
    
    campaigns.forEach(campaign => {
      if (campaign.status in counts) {
        counts[campaign.status as keyof typeof counts]++;
      }
    });
    
    return counts;
  };
  
  const statusCounts = getStatusCounts();

  // Get status color for the numbers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-[#0bbfbf]'; // commercetools teal
      case 'upcoming': return 'text-[#6359ff]'; // commercetools violet
      case 'expired': return 'text-gray-500';
      case 'mixed': return 'text-[#ffc806]'; // commercetools yellow
      default: return 'text-[#6359ff]'; // commercetools violet
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
      {/* Header section with commercetools gradient */}
      <div className="bg-gradient-to-r from-[#6359ff] to-[#0bbfbf] p-5 text-white">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Discount Campaigns</h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleExpandAll}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors 
                bg-white text-[#6359ff] hover:bg-gray-100 
                flex items-center"
            >
              {expandAll ? (
                <>
                  <ChevronUp size={16} className="mr-1" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronDown size={16} className="mr-1" />
                  Expand All
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Campaign filter pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              campaignFilter === 'all' 
                ? 'bg-white text-[#6359ff]' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            onClick={() => setCampaignFilter('all')}
          >
            All Campaigns
          </button>
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              campaignFilter === 'active' 
                ? 'bg-white text-[#0bbfbf]' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            onClick={() => setCampaignFilter('active')}
          >
            Active
          </button>
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              campaignFilter === 'upcoming' 
                ? 'bg-white text-[#6359ff]' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            onClick={() => setCampaignFilter('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              campaignFilter === 'expired' 
                ? 'bg-white text-gray-500' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            onClick={() => setCampaignFilter('expired')}
          >
            Expired
          </button>
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-0 bg-white border-b border-gray-200">
        <div className="p-4 border-r border-gray-200 flex flex-col justify-center items-center">
          <div className="text-3xl font-bold text-[#6359ff]">{campaigns.length}</div>
          <div className="text-sm text-gray-500 mt-1">Total Campaigns</div>
        </div>
        <div className="p-4 border-r border-gray-200 flex flex-col justify-center items-center">
          <div className={`text-3xl font-bold ${getStatusColor('active')}`}>{statusCounts.active}</div>
          <div className="text-sm text-gray-500 mt-1">Active</div>
        </div>
        <div className="p-4 border-r border-gray-200 flex flex-col justify-center items-center">
          <div className={`text-3xl font-bold ${getStatusColor('upcoming')}`}>{statusCounts.upcoming}</div>
          <div className="text-sm text-gray-500 mt-1">Upcoming</div>
        </div>
        <div className="p-4 border-r border-gray-200 flex flex-col justify-center items-center">
          <div className={`text-3xl font-bold ${getStatusColor('expired')}`}>{statusCounts.expired}</div>
          <div className="text-sm text-gray-500 mt-1">Expired</div>
        </div>
        <div className="p-4 flex flex-col justify-center items-center">
          <div className={`text-3xl font-bold ${getStatusColor('mixed')}`}>{statusCounts.mixed}</div>
          <div className="text-sm text-gray-500 mt-1">Mixed Status</div>
        </div>
      </div>
      
      {/* Timeline Legend */}
      <div className="flex flex-wrap items-center gap-5 px-6 py-3 bg-gray-50 text-xs text-gray-600 border-b border-gray-200">
        <div className="font-medium">Timeline Legend:</div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-[#0bbfbf] mr-1"></div>
          <span>Active</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-[#0bbfbf] mr-1"></div>
          <span>Upcoming</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-gray-400 mr-1"></div>
          <span>Expired</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-[#6359ff] mr-1"></div>
          <span>Ongoing</span>
        </div>
        <div className="flex items-center">
          <div className="w-0.5 h-3 bg-red-500 mr-1"></div>
          <span>Today</span>
        </div>
      </div>
      
      {/* Campaign Cards */}
      <div className="p-6 bg-gray-50 min-h-64">
        {filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredCampaigns.map(campaign => (
              <CampaignCard 
                key={campaign.id}
                campaign={campaign}
                isExpanded={expandedCampaigns.has(campaign.id)}
                onToggle={() => toggleCampaign(campaign.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-200">
            <Package size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No discount campaigns found with the current filter.</p>
            <p className="text-gray-400 text-sm mt-2">Try changing the filter or adding campaign data to your discounts.</p>
          </div>
        )}
        
        {/* Show a message when there are many campaigns */}
        {filteredCampaigns.length > 10 && !expandAll && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-[#6359ff] flex items-center shadow-sm">
            <Info size={16} className="mr-2" />
            Showing {filteredCampaigns.length} campaigns. Use the Expand All button to view all campaigns at once.
          </div>
        )}
      </div>
    </div>
  );
};

  export default CampaignGroups;
