export type TimeRange = 'today' | 'week' | 'month';

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
}