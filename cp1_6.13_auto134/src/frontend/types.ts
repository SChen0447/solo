export interface Photo {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  lat: number;
  lng: number;
  date: string;
  diary: string;
  tags: string[];
  createdAt: number;
}

export interface SearchState {
  query: string;
  dateStart: string | null;
  dateEnd: string | null;
}

export interface UploadFormData {
  file: File | null;
  lat: number | null;
  lng: number | null;
  date: string;
  diary: string;
  tags: string[];
}
