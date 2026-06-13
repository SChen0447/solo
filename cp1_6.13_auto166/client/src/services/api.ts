import axios from 'axios'
import type { Plant, HybridResult } from '../types'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export const uploadPlant = async (
  file: File,
  name: string,
  stage: string
): Promise<Plant> => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('name', name)
  formData.append('stage', stage)
  
  const response = await api.post('/plants/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

export const getPlants = async (): Promise<Plant[]> => {
  const response = await api.get('/plants')
  return response.data
}

export const createHybrid = async (
  parent1Id: string,
  parent2Id: string
): Promise<HybridResult> => {
  const response = await api.post('/hybrids', { parent1Id, parent2Id })
  return response.data
}

export const getRankings = async (): Promise<HybridResult[]> => {
  const response = await api.get('/rankings')
  return response.data
}

export const voteHybrid = async (hybridId: string): Promise<{ votes: number }> => {
  const response = await api.post(`/hybrids/${hybridId}/vote`)
  return response.data
}

export const getHybrid = async (hybridId: string): Promise<HybridResult> => {
  const response = await api.get(`/hybrids/${hybridId}`)
  return response.data
}

export default api
