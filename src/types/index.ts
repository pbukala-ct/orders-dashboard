/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CartDiscount {
  id: string;
  version: number;
  createdAt: string;
  lastModifiedAt: string;
  name: {
    [key: string]: string;
  };
  description?: {
    [key: string]: string;
  };
  value: {
    type: 'relative' | 'absolute' | 'fixed';
    permyriad?: number;
    money?: Money[];
  };
  cartPredicate: string;
  target?: {
    type: string;
    predicate?: string;
    triggerPattern?: any[];
    targetPattern?: any[];
    maxOccurrence?: number;
    selectionMode?: string;
  };
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  requiresDiscountCode: boolean;
  sortOrder: string;
  stackingMode: 'Stacking' | 'StopAfterThisDiscount';
  key?: string;
  references?: any[];
}// src/types/index.ts
export type TimeRange = 'today' | 'week' | 'month' | 'year';

export interface Money {
  centAmount: number;
  currencyCode: string;
}
export interface LocalizedString {
  [locale: string]: string;
}

export interface Price {
  value: Money;
  discounted?: {
    value: Money;
  };
}

export interface LineItemVariant {
  id: number;
  sku?: string;
  images?: string[];
}

export interface LineItem {
  id: string;
  productId: string;
  name: LocalizedString;
  quantity: number;
  price: Price;
  variant: LineItemVariant;
  totalPrice: Money;
}

export interface Address {
  firstName?: string;
  lastName?: string;
  streetName?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  additionalAddressInfo?: string;
}

export interface Order {
  id: string;
  version: number;
  createdAt: string;
  lastModifiedAt: string;
  totalPrice: Money;
  orderNumber?: string;
  orderState: string;
  lineItems: LineItem[];
  customerId?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
}

// New types for discounts

export type DiscountType = 'percentage' | 'absolute' | 'fixed';

// export interface Discount {
//   id: string;
//   name: string;
//   code: string;
//   description: string;
//   active: boolean;
//   discount: number;
//   discountType: DiscountType;
//   validFrom: string;
//   validUntil: string | null;
//   usageCount: number;
// }

export interface DiscountCampaign {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  discounts: Discount[];
  status: 'active' | 'scheduled' | 'ended' | 'draft';
  target: {
    customerGroups?: string[];
    products?: string[];
    categories?: string[];
  };
}

// Discount usage types
export interface DiscountUsage {
  id: string;
  name: string;
  key: string | null;
  isActive: boolean;
  totalAmount: number;
  orderCount: number;
  currencyCode: string;
}

// Commercetools order discount types
export interface DiscountedLineItemPortion {
  discount: {
    typeId: 'cart-discount';
    id: string;
  };
  discountedAmount: Money;
}


export interface Discount {
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
  version: number; // Added for cap enforcement
  custom?: {
    fields?: {
      // Budget-related fields
      cap?: {
        centAmount: number;
        currencyCode: string;
      };
      used?: {
        centAmount: number;
        currencyCode: string;
      };
      
      // Usage cap and auto-disable
      'application-cap'?: number;
      'auto'?: boolean;
      
      // Campaign grouping
      'campaing-key'?: string; // Note: Using the original field name with typo
      'campaign-name'?: string;
      'start-date'?: string;
      'end-date'?: string;
    }
  };
}