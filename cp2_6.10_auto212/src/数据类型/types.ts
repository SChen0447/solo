export type EditionType = 'first' | 'reprint' | 'colored'

export type StatusType = 'for_sale' | 'for_trade' | 'show_only'

export interface VinylRecord {
  id: string
  name: string
  artist: string
  year: number
  edition: EditionType
  status: StatusType
  coverImage: string
  sellerPhone: string
  story: string
  createdAt: number
}

export interface FavoriteItem {
  recordId: string
  favoritedAt: number
}

export const EditionColors: Record<EditionType, string> = {
  first: '#d4a373',
  reprint: '#8d6e63',
  colored: '#5d4037'
}

export const EditionLabels: Record<EditionType, string> = {
  first: '首版',
  reprint: '再版',
  colored: '彩胶'
}

export const StatusColors: Record<StatusType, string> = {
  for_sale: '#2a9d8f',
  for_trade: '#e76f51',
  show_only: '#4ecdc4'
}

export const StatusLabels: Record<StatusType, string> = {
  for_sale: '在售',
  for_trade: '可交换',
  show_only: '仅供展示'
}
