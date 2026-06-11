export interface Bid {
  id: string;
  bidder: string;
  amount: number;
  timestamp: number;
  isUserBid?: boolean;
}

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  startingPrice: number;
  currentPrice: number;
  endTime: number;
  gradient: string;
  description: string;
  bids: Bid[];
}

export interface UserBidRecord {
  id: string;
  artworkId: string;
  artworkTitle: string;
  amount: number;
  timestamp: number;
  status: 'leading' | 'outbid';
}
