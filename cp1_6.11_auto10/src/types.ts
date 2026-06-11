export interface User {
  id: string;
  name: string;
  balance: number;
}

export interface Trade {
  id: string;
  time: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  counterparty: string;
  total: number;
}

export interface Order {
  id: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  creatorId: string;
  creatorName: string;
  createdAt: string;
}
