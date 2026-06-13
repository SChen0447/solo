export interface Profile {
  id: string;
  name: string;
  bio: string;
  signature: string;
  coverImage: string;
}

export interface Work {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  audioUrl: string;
  duration: number;
  plays: number;
  tags: string[];
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  venueUrl: string;
  price: string;
  ticketUrl: string;
  description: string;
}

export interface DailyStats {
  date: string;
  plays: number;
}

export interface StatsSummary {
  totalPlays: number;
  totalWorks: number;
  totalEvents: number;
}
