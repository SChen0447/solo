export type MediaType = 'image' | 'audio' | 'video';

export interface MediaFile {
  id: string;
  type: MediaType;
  url: string;
  name: string;
  size: number;
}

export interface Blessing {
  id: string;
  content: string;
  createdAt: number;
  template: BlessingTemplate;
}

export type BlessingTemplate = 'letter' | 'leaf' | 'feather' | 'origami';

export type BottleColor = 'pink' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export const BOTTLE_COLORS: Record<BottleColor, string> = {
  pink: '#f8c8dc',
  blue: '#add8e6',
  green: '#c8e6c9',
  yellow: '#fff9c4',
  purple: '#e1bee7',
  orange: '#ffd8b1',
};

export const BLESSING_TEMPLATES: BlessingTemplate[] = ['letter', 'leaf', 'feather', 'origami'];

export interface Bottle {
  id: string;
  title: string;
  content: string;
  fontFamily: 'default' | 'handwriting';
  media: MediaFile[];
  openAt: number;
  createdAt: number;
  creatorId: string;
  color: BottleColor;
  blessings: Blessing[];
  position: {
    x: number;
    y: number;
    speed: number;
    direction: number;
    size: number;
  };
}

export const API_BASE = '/api';

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4'];
