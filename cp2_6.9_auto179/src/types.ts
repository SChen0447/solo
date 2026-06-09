export type VenueStatus = 'confirmed' | 'pending' | 'cancelled';

export interface Venue {
  id: string;
  name: string;
  address: string;
  contactPhone: string;
  notes: string;
  status: VenueStatus;
  city: string;
  lat: number;
  lng: number;
  date: string;
}

export interface Song {
  id: string;
  name: string;
  duration: number;
  bpm: number;
  key: string;
  notes: string;
  order: number;
}

export interface Collaborator {
  id: string;
  email: string;
  nickname: string;
  color: string;
  token: string;
  accepted: boolean;
}

export interface Tour {
  id: string;
  name: string;
  bandSize: number;
  startCity: string;
  endCity: string;
  totalDays: number;
  startDate: string;
  venues: Venue[];
  songs: Song[];
  collaborators: Collaborator[];
  createdAt: string;
}

export type ViewMode = 'schedule' | 'setlist';

export interface AppContextType {
  tours: Tour[];
  selectedTourId: string | null;
  expandedTourId: string | null;
  viewMode: ViewMode;
  isLoggedIn: boolean;
  currentUser: Collaborator | null;
  ws: WebSocket | null;
  setSelectedTourId: (id: string | null) => void;
  setExpandedTourId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  createTour: (data: Partial<Tour>) => Promise<Tour>;
  updateTour: (id: string, data: Partial<Tour>) => Promise<void>;
  deleteTour: (id: string) => Promise<void>;
  updateSongs: (tourId: string, songs: Song[]) => Promise<void>;
  updateVenue: (tourId: string, venueId: string, venue: Partial<Venue>) => Promise<void>;
  sendInvite: (tourId: string, email: string, nickname?: string) => Promise<{ inviteLink: string }>;
  login: () => void;
}
