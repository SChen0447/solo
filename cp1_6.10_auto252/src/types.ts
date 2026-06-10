export interface Product {
  id: string;
  name: string;
  specification: string;
  unit: string;
  purchasePrice: number;
  retailPrice: number;
  stock: number;
  warningThreshold: number;
}

export interface QuoteItem {
  productId: string;
  productName: string;
  specification: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Quote {
  id: string;
  items: QuoteItem[];
  discount: number;
  totalAmount: number;
  createdAt: string;
}

export interface AppState {
  products: Product[];
  currentQuote: QuoteItem[];
  discount: number;
  history: Quote[];
}

export type ViewMode = 'products' | 'history';
