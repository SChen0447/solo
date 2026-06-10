export interface Flaw {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Leather {
  id: string;
  name: string;
  width: number;
  height: number;
  flaws: Flaw[];
  color: string;
}

export interface OrderItem {
  name: string;
  width: number;
  height: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
}

export interface CutRect {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
