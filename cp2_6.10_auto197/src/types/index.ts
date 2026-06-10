export interface Photo {
  id: string
  title: string
  date: string
  location: string
  lat: number
  lng: number
  imageUrl: string
  note: string
  audioData: string | null
}
