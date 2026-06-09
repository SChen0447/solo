export interface User {
  id: number;
  username: string;
  avatar: string;
}

export interface Bid {
  userId: number;
  username: string;
  avatar: string;
  price: number;
  time: string;
}

export interface Sample {
  id: number;
  name: string;
  story: string;
  ownerId: number;
  colors: string[];
  startPrice: number;
  currentPrice: number;
  endTime: string;
  thumbnail: string | null;
  status: 'auctioning' | 'ended' | 'sold';
  bidHistory: Bid[];
}
