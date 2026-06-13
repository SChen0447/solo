export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

export interface User {
  id: string;
  username: string;
}

export interface Plant {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  createdAtDate: number;
}

export interface PlantRecord {
  id: string;
  plantId: string;
  userId: string;
  date: string;
  weather: WeatherType;
  humidity: number;
}

export type PageType = 'login' | 'register' | 'garden' | 'plant-detail';
