export interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: string;
  material: string;
  dimensions: string;
  description: string;
  thumbnail: string;
  fullImage: string;
  order: number;
  createdAt: number;
}

export interface Exhibition {
  id: string;
  theme: string;
  description: string;
  artworkIds: string[];
  order: number;
  createdAt: number;
}

export type GalleryState = {
  artworks: Artwork[];
  exhibitions: Exhibition[];
  currentView: 'gallery' | 'curator';
  currentExhibitionId: string | null;
};

export const STORAGE_KEYS = {
  ARTWORKS: 'art_gallery_artworks',
  EXHIBITIONS: 'art_gallery_exhibitions'
} as const;
