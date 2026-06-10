export interface User {
  username: string;
  password: string;
}

export interface ArtworkData {
  id: string;
  name: string;
  imageData: string;
  fileName: string;
  x: number;
  y: number;
  wallIndex: number;
}

export interface Exhibit {
  id: string;
  owner: string;
  createdAt: number;
  wallCount: number;
  artworks: ArtworkData[];
}

export interface ArtworkPosition {
  x: number;
  y: number;
  wallIndex: number;
}

export interface GallerySceneRef {
  addArtwork: (artwork: ArtworkData) => void;
  removeArtwork: (id: string) => void;
  updateArtworkName: (id: string, name: string) => void;
  exportLayout: () => ArtworkData[];
  addWall: () => void;
}
