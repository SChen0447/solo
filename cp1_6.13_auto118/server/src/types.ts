export interface Fingerprint {
  id: string;
  shapeType: 'polygon' | 'spiral' | 'circle' | 'wave';
  shapePoints: number[];
  colorScheme: ColorScheme;
  pulseSpeed: number;
  poemText: string;
  anonymousText: string;
  audioPath: string;
  likes: number;
  createdAt: number;
  originalText: string;
  guessOptions: string[];
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  isWarm: boolean;
}

export interface FingerprintThumbnail {
  id: string;
  shapeType: 'polygon' | 'spiral' | 'circle' | 'wave';
  primaryColor: string;
  shapePoints: number[];
  likes: number;
}

export interface UploadResponse {
  fingerprint: Fingerprint;
}

export interface GuessRequest {
  fingerprintId: string;
  selectedOption: string;
}

export interface GuessResponse {
  correct: boolean;
  fingerprint?: Fingerprint;
}

export interface ProfileData {
  uploaded: Fingerprint[];
  liked: Fingerprint[];
}
