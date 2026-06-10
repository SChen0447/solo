export interface Tier {
  id: string;
  price: number;
  reward: string;
  remaining: number;
}

export interface VoteOption {
  id: string;
  label: string;
  votes: number;
  color: string;
}

export interface Vote {
  id: string;
  question: string;
  options: VoteOption[];
  totalVotes: number;
  hasVoted: boolean;
}

export interface UnlockedContent {
  id: string;
  threshold: number;
  title: string;
  description: string;
  type: 'audio' | 'video' | 'behind';
  isUnlocked: boolean;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverGradient: string;
  coverEmoji: string;
  description: string;
  goalAmount: number;
  pledgedAmount: number;
  tiers: Tier[];
  unlockedContent: UnlockedContent[];
  votes: Vote[];
}

export type AppAction =
  | { type: 'PURCHASE_TIER'; albumId: string; tierId: string }
  | { type: 'CAST_VOTE'; albumId: string; voteId: string; optionId: string }
  | { type: 'UNLOCK_MILESTONE'; albumId: string; contentId: string }
  | { type: 'SYNC_STATE'; albums: Album[] };
