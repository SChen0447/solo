export type FragranceType = '柑橘调' | '花香调' | '木质调' | '草本调' | '东方调';

export type PackagingType = '玻璃瓶' | '铁罐' | '布袋';

export type OrderStatus = '待调配' | '生产中' | '已发货' | '已完成';

export interface Candle {
  id: string;
  name: string;
  fragrance: FragranceType;
  color: string;
  stock: number;
  packaging: PackagingType;
  tags: string[];
  photoUrl: string;
  createdAt: string;
}

export interface OrderItem {
  candleId: string;
  candleName: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  expectedDate: string;
  status: OrderStatus;
  createdAt: string;
}

export interface FragrancePreferences {
  柑橘调: number;
  花香调: number;
  木质调: number;
  草本调: number;
  东方调: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes: string;
  fragrancePreferences: FragrancePreferences;
  lastPurchaseDate: string | null;
  favoritePackaging: PackagingType | null;
  orderHistory: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CandleFormData {
  name: string;
  fragrance: FragranceType;
  color: string;
  stock: number;
  packaging: PackagingType;
  tags: string[];
  photoUrl: string;
}

export interface OrderFormData {
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  expectedDate: string;
  status: OrderStatus;
}
