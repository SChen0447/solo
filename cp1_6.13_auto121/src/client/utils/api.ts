import axios from 'axios';
import { DecodeRequest, DecodeResult, FragmentData } from '../../types/scroll';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const decodeFragment = async (fragmentId: string, slotIndex: number): Promise<DecodeResult> => {
  try {
    const response = await api.post<DecodeResult>('/decode', {
      fragmentId,
      slotIndex
    } as DecodeRequest);
    return response.data;
  } catch (error) {
    console.error('解码请求失败:', error);
    return { matched: false };
  }
};

export const fetchFragments = async (): Promise<FragmentData[]> => {
  try {
    const response = await api.get<FragmentData[]>('/decode/fragments');
    return response.data;
  } catch (error) {
    console.error('获取碎片失败:', error);
    return [];
  }
};

export default api;
