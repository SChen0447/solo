export interface PoemSegment {
  id: string;
  content: string;
  author: string;
  createdAt: number;
  parentId: string | null;
  chainId: string;
  inspiration: {
    type: 'original' | 'reference';
    source?: string;
    originalText?: string;
  };
}

export interface PoemChain {
  id: string;
  segments: PoemSegment[];
  createdAt: number;
  inspiration: {
    type: 'original' | 'reference';
    source?: string;
    originalText?: string;
  };
}

export interface CreatePoemRequest {
  content: string;
  author: string;
  inspiration: {
    type: 'original' | 'reference';
    source?: string;
    originalText?: string;
  };
}

export interface ExtendPoemRequest {
  content: string;
  author: string;
}
