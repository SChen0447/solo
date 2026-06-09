export type PlantType = '多肉' | '绿萝' | '虎皮兰' | '龟背竹' | '其他';
export type InitialSize = '种子' | '幼苗' | '成株';
export type ActionType = '浇水' | '施肥' | '修剪';
export type HealthStatus = 'healthy' | 'neutral' | 'wilting';

export interface CareAction {
  id: string;
  type: ActionType;
  date: string;
}

export interface Plant {
  id: string;
  name: string;
  type: PlantType;
  initialSize: InitialSize;
  createdAt: string;
  careActions: CareAction[];
  healthStatus: HealthStatus;
  lastCareDate: string | null;
}

export interface PlantListResponse {
  plants: Plant[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface GrowthData {
  plantId: string;
  growthProgress: number;
  healthStatus: HealthStatus;
  initialSize: InitialSize;
  careActions: CareAction[];
}
