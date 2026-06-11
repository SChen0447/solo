import { GalleryWork, PlacedFlower, VaseType } from '@/types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

let galleryData: GalleryWork[] = [
  {
    id: 'work-1',
    name: '春日花语',
    flowers: [
      { id: 'f1', flowerType: 'rose', stemHeight: 40, position: { x: 0.2, z: 0.1 }, rotation: 45 },
      { id: 'f2', flowerType: 'tulip', stemHeight: 35, position: { x: -0.2, z: 0.2 }, rotation: 120 },
      { id: 'f3', flowerType: 'lily', stemHeight: 45, position: { x: 0, z: -0.2 }, rotation: 200 },
      { id: 'f4', flowerType: 'eucalyptus', stemHeight: 30, position: { x: 0.3, z: -0.1 }, rotation: 90 }
    ],
    vaseType: 'round',
    timestamp: Date.now() - 86400000 * 2,
    thumbnail: '',
    author: '花艺师小美'
  },
  {
    id: 'work-2',
    name: '紫色梦境',
    flowers: [
      { id: 'f5', flowerType: 'lavender', stemHeight: 38, position: { x: 0.1, z: 0.3 }, rotation: 30 },
      { id: 'f6', flowerType: 'lavender', stemHeight: 42, position: { x: -0.2, z: -0.1 }, rotation: 150 },
      { id: 'f7', flowerType: 'hydrangea', stemHeight: 35, position: { x: 0.2, z: -0.2 }, rotation: 270 },
      { id: 'f8', flowerType: 'eucalyptus', stemHeight: 28, position: { x: -0.3, z: 0.1 }, rotation: 60 }
    ],
    vaseType: 'long',
    timestamp: Date.now() - 86400000,
    thumbnail: '',
    author: '花房姑娘'
  },
  {
    id: 'work-3',
    name: '暖阳盛放',
    flowers: [
      { id: 'f9', flowerType: 'sunflower', stemHeight: 50, position: { x: 0, z: 0 }, rotation: 0 },
      { id: 'f10', flowerType: 'daisy', stemHeight: 30, position: { x: 0.3, z: 0.2 }, rotation: 90 },
      { id: 'f11', flowerType: 'daisy', stemHeight: 28, position: { x: -0.25, z: 0.15 }, rotation: 180 },
      { id: 'f12', flowerType: 'carnation', stemHeight: 35, position: { x: 0.1, z: -0.3 }, rotation: 270 },
      { id: 'f13', flowerType: 'eucalyptus', stemHeight: 32, position: { x: -0.2, z: -0.2 }, rotation: 45 }
    ],
    vaseType: 'square',
    timestamp: Date.now() - 3600000 * 5,
    thumbnail: '',
    author: '阳光花园'
  },
  {
    id: 'work-4',
    name: '粉色浪漫',
    flowers: [
      { id: 'f14', flowerType: 'peony', stemHeight: 42, position: { x: 0.1, z: 0.1 }, rotation: 30 },
      { id: 'f15', flowerType: 'rose', stemHeight: 38, position: { x: -0.2, z: 0.1 }, rotation: 120 },
      { id: 'f16', flowerType: 'carnation', stemHeight: 40, position: { x: 0.15, z: -0.2 }, rotation: 210 },
      { id: 'f17', flowerType: 'tulip', stemHeight: 35, position: { x: -0.1, z: 0.25 }, rotation: 300 }
    ],
    vaseType: 'round',
    timestamp: Date.now() - 3600000 * 2,
    thumbnail: '',
    author: '粉色花海'
  },
  {
    id: 'work-5',
    name: '清新自然',
    flowers: [
      { id: 'f18', flowerType: 'lily', stemHeight: 45, position: { x: 0.2, z: 0 }, rotation: 60 },
      { id: 'f19', flowerType: 'daisy', stemHeight: 32, position: { x: -0.15, z: 0.25 }, rotation: 150 },
      { id: 'f20', flowerType: 'eucalyptus', stemHeight: 38, position: { x: 0, z: -0.2 }, rotation: 240 },
      { id: 'f21', flowerType: 'eucalyptus', stemHeight: 30, position: { x: -0.25, z: -0.1 }, rotation: 330 }
    ],
    vaseType: 'long',
    timestamp: Date.now() - 3600000,
    thumbnail: '',
    author: '自然主义'
  },
  {
    id: 'work-6',
    name: '富贵满堂',
    flowers: [
      { id: 'f22', flowerType: 'peony', stemHeight: 48, position: { x: 0, z: 0.1 }, rotation: 0 },
      { id: 'f23', flowerType: 'peony', stemHeight: 44, position: { x: 0.25, z: -0.1 }, rotation: 90 },
      { id: 'f24', flowerType: 'rose', stemHeight: 40, position: { x: -0.2, z: -0.15 }, rotation: 180 },
      { id: 'f25', flowerType: 'carnation', stemHeight: 38, position: { x: 0.1, z: 0.25 }, rotation: 270 },
      { id: 'f26', flowerType: 'eucalyptus', stemHeight: 35, position: { x: -0.3, z: 0.05 }, rotation: 45 }
    ],
    vaseType: 'square',
    timestamp: Date.now() - 1800000,
    thumbnail: '',
    author: '牡丹亭'
  }
]

export const api = {
  async getGalleryWorks(): Promise<GalleryWork[]> {
    await delay(300)
    return JSON.parse(JSON.stringify(galleryData))
  },

  async getWorkById(id: string): Promise<GalleryWork | null> {
    await delay(200)
    const work = galleryData.find(w => w.id === id)
    return work ? JSON.parse(JSON.stringify(work)) : null
  },

  async saveWork(
    name: string,
    flowers: PlacedFlower[],
    vaseType: VaseType,
    thumbnail: string
  ): Promise<{ id: string; success: boolean; previewUrl: string }> {
    await delay(500)
    
    const newWork: GalleryWork = {
      id: `work-${Date.now()}`,
      name,
      flowers: JSON.parse(JSON.stringify(flowers)),
      vaseType,
      timestamp: Date.now(),
      thumbnail,
      author: '我'
    }
    
    galleryData.unshift(newWork)
    
    return {
      id: newWork.id,
      success: true,
      previewUrl: `/gallery/${newWork.id}`
    }
  }
}
