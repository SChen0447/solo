export interface Location {
  city: string
  lat: number
  lng: number
}

export interface DriftRecord {
  id: string
  bookId: string
  fromUserId: string
  toUserId: string
  fromUserName: string
  toUserName: string
  fromLocation: Location
  toLocation: Location
  message: string
  driftCode: string
  status: 'pending' | 'confirmed' | 'completed'
  createdAt: string
  confirmedAt?: string
  completedAt?: string
  stayDays?: number
}

export interface Book {
  id: string
  title: string
  author: string
  publisher: string
  publishYear: number
  coverImages: string[]
  status: 'available' | 'drifting' | 'exchanged' | 'borrow_only'
  ownerId: string
  ownerName: string
  exchangeRule: 'exchange' | 'borrow_only' | 'designated'
  designatedUserId?: string
  currentLocation: Location
  driftHistory: DriftRecord[]
  createdAt: string
  description: string
}

export interface User {
  id: string
  name: string
  avatar: string
  registeredAt: string
  location: Location
  exchangeCount: number
}

export type BookStatus = Book['status']
