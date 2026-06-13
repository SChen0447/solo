export type Continent = 'asia' | 'europe' | 'northAmerica' | 'southAmerica' | 'africa' | 'oceania';

export type ConcertStatus = 'pending' | 'confirmed' | 'planned';

export interface City {
  id: string;
  name: string;
  country: string;
  continent: Continent;
  lat: number;
  lng: number;
}

export interface Concert {
  id: string;
  cityId: string;
  city: City;
  artistId: string;
  artistName: string;
  date: string;
  status: ConcertStatus;
  votes: number;
  targetVotes: number;
  thumbnail?: string;
}

export interface Tour {
  id: string;
  artistId: string;
  artistName: string;
  cities: Concert[];
  createdAt: string;
  updatedAt: string;
}

export interface WallMessage {
  id: string;
  artistId: string;
  text: string;
  color: string;
  nickname: string;
  likes: number;
  timestamp: string;
  rotation: number;
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  avatar?: string;
  bio: string;
}

export interface CreateTourRequest {
  artistId: string;
  cities: Array<{ cityId: string; date: string; initialVotes?: number }>;
}

export interface VoteRequest {
  concertId: string;
  cityName: string;
}

export interface VoteResponse {
  concertId: string;
  votes: number;
  success: boolean;
  message?: string;
}

export interface WallMessageRequest {
  text: string;
  color: string;
  nickname: string;
}

export const CONTINENT_COLORS: Record<Continent, string> = {
  asia: '#e74c3c',
  europe: '#e67e22',
  northAmerica: '#3498db',
  southAmerica: '#2ecc71',
  africa: '#f1c40f',
  oceania: '#9b59b6',
};

export const PRESET_ARTISTS: Artist[] = [
  {
    id: '1',
    name: '星河乐队',
    genre: '独立摇滚',
    bio: '来自上海的四人独立摇滚乐队，成立于2018年，以梦幻般的吉他音墙和诗意的歌词著称。',
  },
  {
    id: '2',
    name: '午夜电台',
    genre: '电子流行',
    bio: '融合复古合成器与未来感 beats 的电子音乐人，现场演出充满霓虹色彩和迷幻氛围。',
  },
  {
    id: '3',
    name: '迷雾行者',
    genre: '民谣',
    bio: '城市民谣创作歌手，用吉他和口琴讲述都市人的孤独与温暖，足迹遍布全国livehouse。',
  },
  {
    id: '4',
    name: '霓虹花园',
    genre: '后朋克',
    bio: '重庆独立乐队，融合后朋克的冷冽与重庆的烟火气，现场能量爆棚。',
  },
];

export const PRESET_CITIES: City[] = [
  { id: 'c1', name: '北京', country: '中国', continent: 'asia', lat: 39.9042, lng: 116.4074 },
  { id: 'c2', name: '上海', country: '中国', continent: 'asia', lat: 31.2304, lng: 121.4737 },
  { id: 'c3', name: '广州', country: '中国', continent: 'asia', lat: 23.1291, lng: 113.2644 },
  { id: 'c4', name: '成都', country: '中国', continent: 'asia', lat: 30.5728, lng: 104.0668 },
  { id: 'c5', name: '东京', country: '日本', continent: 'asia', lat: 35.6762, lng: 139.6503 },
  { id: 'c6', name: '首尔', country: '韩国', continent: 'asia', lat: 37.5665, lng: 126.9780 },
  { id: 'c7', name: '伦敦', country: '英国', continent: 'europe', lat: 51.5074, lng: -0.1278 },
  { id: 'c8', name: '柏林', country: '德国', continent: 'europe', lat: 52.5200, lng: 13.4050 },
  { id: 'c9', name: '巴黎', country: '法国', continent: 'europe', lat: 48.8566, lng: 2.3522 },
  { id: 'c10', name: '纽约', country: '美国', continent: 'northAmerica', lat: 40.7128, lng: -74.0060 },
  { id: 'c11', name: '洛杉矶', country: '美国', continent: 'northAmerica', lat: 34.0522, lng: -118.2437 },
  { id: 'c12', name: '多伦多', country: '加拿大', continent: 'northAmerica', lat: 43.6532, lng: -79.3832 },
  { id: 'c13', name: '圣保罗', country: '巴西', continent: 'southAmerica', lat: -23.5505, lng: -46.6333 },
  { id: 'c14', name: '布宜诺斯艾利斯', country: '阿根廷', continent: 'southAmerica', lat: -34.6037, lng: -58.3816 },
  { id: 'c15', name: '约翰内斯堡', country: '南非', continent: 'africa', lat: -26.2041, lng: 28.0473 },
  { id: 'c16', name: '开罗', country: '埃及', continent: 'africa', lat: 30.0444, lng: 31.2357 },
  { id: 'c17', name: '悉尼', country: '澳大利亚', continent: 'oceania', lat: -33.8688, lng: 151.2093 },
  { id: 'c18', name: '墨尔本', country: '澳大利亚', continent: 'oceania', lat: -37.8136, lng: 144.9631 },
  { id: 'c19', name: '奥克兰', country: '新西兰', continent: 'oceania', lat: -36.8485, lng: 174.7633 },
  { id: 'c20', name: '重庆', country: '中国', continent: 'asia', lat: 29.4316, lng: 106.9123 },
];

export const PRESET_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db',
  '#9b59b6', '#1abc9c', '#e91e63', '#ff5722', '#00bcd4',
];

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
