export interface Spot {
  id: string
  name: string
  duration: number
  rating: number
  lat: number
  lng: number
}

export interface DayPlan {
  id: string
  date: string
  spots: Spot[]
}

export type Itinerary = DayPlan[]
