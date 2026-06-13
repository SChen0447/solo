export type ComponentType = 'player' | 'playlist' | 'social';

export type PlayMode = 'loop' | 'single' | 'shuffle';

export type AudioType = 'upload' | 'url';

export type IconStyle = 'rounded' | 'circle' | 'borderless';

export type SocialPlatform = 'spotify' | 'instagram' | 'youtube' | 'twitter' | 'tiktok';

export interface BaseComponent {
  id: string;
  type: ComponentType;
  position: number;
}

export interface PlayerComponent extends BaseComponent {
  type: 'player';
  coverImage: string;
  backgroundColor: string;
  playMode: PlayMode;
  audioUrl: string;
  audioType: AudioType;
  title: string;
  artist: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  cover: string;
  tagColor: string;
}

export interface PlaylistComponent extends BaseComponent {
  type: 'playlist';
  songs: Song[];
  title: string;
}

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
}

export interface SocialComponent extends BaseComponent {
  type: 'social';
  links: SocialLink[];
  iconStyle: IconStyle;
  title: string;
}

export type CanvasComponent = PlayerComponent | PlaylistComponent | SocialComponent;

export interface Theme {
  id: string;
  name: string;
  background: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  cardBg: string;
  cardBorder: string;
  shadow: string;
  fontFamily: string;
  gridColor: string;
}

export interface GradientColor {
  id: string;
  name: string;
  value: string;
}
