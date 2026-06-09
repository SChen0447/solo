import * as listingRepo from '../repositories/listingRepository';
import * as artworkRepo from '../repositories/artworkRepository';
import * as userRepo from '../repositories/userRepository';
import type { MarketListing, Artwork } from '../../src/types';

export async function listArtwork(
  userId: string,
  username: string,
  artworkId: string,
  price: number
): Promise<MarketListing> {
  if (price <= 0) {
    throw new Error('价格必须大于0');
  }

  const artwork = await artworkRepo.getArtworkById(artworkId);
  if (!artwork) {
    throw new Error('作品不存在');
  }
  if (artwork.userId !== userId) {
    throw new Error('只能上架自己的作品');
  }
  if (artwork.listed) {
    throw new Error('作品已在市场中');
  }

  await artworkRepo.setArtworkListed(artworkId, true);
  const listing = await listingRepo.createListing(
    artworkId,
    userId,
    username,
    artwork.name,
    artwork.thumbnailColors,
    price
  );

  return listing;
}

export interface BuyResult {
  success: boolean;
  artwork?: Artwork;
  sellerCoins?: number;
  buyerCoins?: number;
  sellerId?: string;
  message?: string;
}

export async function buyArtwork(buyerId: string, listingId: string): Promise<BuyResult> {
  const listing = await listingRepo.getListingById(listingId);
  if (!listing) {
    return { success: false, message: '交易不存在' };
  }
  if (listing.sellerId === buyerId) {
    return { success: false, message: '不能购买自己的作品' };
  }

  const buyer = await userRepo.findUserById(buyerId);
  if (!buyer) {
    return { success: false, message: '买家不存在' };
  }
  if (buyer.coins < listing.price) {
    return { success: false, message: '金币不足' };
  }

  const seller = await userRepo.findUserById(listing.sellerId);
  if (!seller) {
    return { success: false, message: '卖家不存在' };
  }

  const newBuyerCoins = buyer.coins - listing.price;
  const newSellerCoins = seller.coins + listing.price;

  await userRepo.updateUserCoins(buyerId, newBuyerCoins);
  await userRepo.updateUserCoins(listing.sellerId, newSellerCoins);
  await artworkRepo.updateArtworkOwner(listing.artworkId, buyerId);
  await listingRepo.deleteListing(listingId);

  const artwork = await artworkRepo.getArtworkById(listing.artworkId);

  return {
    success: true,
    artwork: artwork || undefined,
    sellerCoins: newSellerCoins,
    buyerCoins: newBuyerCoins,
    sellerId: listing.sellerId,
  };
}
