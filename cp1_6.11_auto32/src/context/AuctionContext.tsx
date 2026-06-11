import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Artwork, Bid, UserBidRecord } from '../types';
import { generateMockArtworks, mockBidders } from '../mockData';
import { v4 as uuidv4 } from 'uuid';

interface AuctionContextType {
  artworks: Artwork[];
  userBids: UserBidRecord[];
  autoBidEnabled: boolean;
  setAutoBidEnabled: (enabled: boolean) => void;
  placeBid: (artworkId: string, amount: number, bidder: string, isUserBid?: boolean) => boolean;
  getArtworkById: (id: string) => Artwork | undefined;
  currentUser: string;
}

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

export const useAuction = () => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
};

export const AuctionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [artworks, setArtworks] = useState<Artwork[]>(() => generateMockArtworks());
  const [userBids, setUserBids] = useState<UserBidRecord[]>([]);
  const [autoBidEnabled, setAutoBidEnabled] = useState(true);
  const currentUser = '我';

  const getArtworkById = useCallback((id: string) => {
    return artworks.find(a => a.id === id);
  }, [artworks]);

  const updateUserBidStatuses = useCallback((updatedArtworks: Artwork[]) => {
    setUserBids(prevBids => {
      return prevBids.map(bid => {
        const artwork = updatedArtworks.find(a => a.id === bid.artworkId);
        if (!artwork) return bid;
        const highestBid = artwork.bids.length > 0 ? artwork.bids[0] : null;
        if (highestBid && highestBid.bidder === currentUser && highestBid.amount === bid.amount) {
          return { ...bid, status: 'leading' as const };
        }
        return { ...bid, status: 'outbid' as const };
      });
    });
  }, []);

  const placeBid = useCallback((artworkId: string, amount: number, bidder: string, isUserBid: boolean = false): boolean => {
    let success = false;

    setArtworks(prevArtworks => {
      const newArtworks = prevArtworks.map(artwork => {
        if (artwork.id !== artworkId) return artwork;
        if (amount <= artwork.currentPrice) return artwork;

        const newBid: Bid = {
          id: uuidv4(),
          bidder,
          amount,
          timestamp: Date.now(),
          isUserBid
        };

        success = true;
        return {
          ...artwork,
          currentPrice: amount,
          bids: [newBid, ...artwork.bids]
        };
      });

      if (success) {
        updateUserBidStatuses(newArtworks);
      }

      return newArtworks;
    });

    if (success && isUserBid) {
      const artwork = artworks.find(a => a.id === artworkId);
      if (artwork) {
        const newUserBid: UserBidRecord = {
          id: uuidv4(),
          artworkId,
          artworkTitle: artwork.title,
          amount,
          timestamp: Date.now(),
          status: 'leading'
        };
        setUserBids(prev => [newUserBid, ...prev]);
      }
    }

    return success;
  }, [artworks, updateUserBidStatuses]);

  useEffect(() => {
    if (!autoBidEnabled) return;

    const scheduleNextBid = () => {
      const delay = 5000 + Math.random() * 10000;
      return setTimeout(() => {
        const activeArtworks = artworks.filter(a => a.endTime > Date.now());
        if (activeArtworks.length === 0) return;

        const randomArtwork = activeArtworks[Math.floor(Math.random() * activeArtworks.length)];
        const randomBidder = mockBidders[Math.floor(Math.random() * mockBidders.length)];
        const minIncrement = 10;
        const maxIncrement = 50;
        const increment = Math.floor((minIncrement + Math.random() * (maxIncrement - minIncrement)) / 10) * 10;
        const newAmount = randomArtwork.currentPrice + increment;

        placeBid(randomArtwork.id, newAmount, randomBidder, false);
      }, delay);
    };

    let timeoutId = scheduleNextBid();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoBidEnabled, artworks, placeBid]);

  return (
    <AuctionContext.Provider value={{
      artworks,
      userBids,
      autoBidEnabled,
      setAutoBidEnabled,
      placeBid,
      getArtworkById,
      currentUser
    }}>
      {children}
    </AuctionContext.Provider>
  );
};
