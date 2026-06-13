import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export interface Note {
  name: string;
  octave: number;
  start: number;
  duration: number;
  strength: 'strong' | 'weak';
}

export interface AnalyzeResult {
  notes: Note[];
  bpm: number;
  key: string;
  timeSignature: string;
}

export interface Chord {
  name: string;
  degree: string;
  frets: number[];
  fingers: number[];
  start: number;
  duration: number;
}

export interface ChordProgression {
  id: number;
  name: string;
  description: string;
  chords: Chord[];
}

export interface DrumPattern {
  kick: number[];
  snare: number[];
  hihat: number[];
}

export interface Accompaniment {
  timeSignature: string;
  bpm: number;
  drums: DrumPattern;
  bass: { note: string; octave: number; start: number; duration: number }[];
  strings: { note: string; octave: number; start: number; duration: number }[];
}

export interface MelodyArchive {
  id?: string;
  name: string;
  description: string;
  createdAt?: string;
  bpm: number;
  key: string;
  notes: Note[];
  chords: Chord[];
  accompaniment: Accompaniment | null;
}

class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data;
      },
      (error) => {
        console.error('Response error:', error);
        const message = error.response?.data?.message || error.message || '请求失败';
        return Promise.reject(new Error(message));
      }
    );
  }

  async analyzeAudio(audioData: { audio: string }): Promise<AnalyzeResult> {
    return this.instance.post('/analyze', audioData);
  }

  async generateChords(notes: Note[]): Promise<ChordProgression[]> {
    return this.instance.post('/chords', { notes });
  }

  async generateAccompaniment(bpm: number, chords: Chord[], onProgress?: (p: number) => void): Promise<Accompaniment> {
    if (onProgress) {
      const progressSteps = [10, 25, 40, 55, 70, 85, 95];
      let step = 0;
      const interval = setInterval(() => {
        if (step < progressSteps.length) {
          onProgress(progressSteps[step++]);
        } else {
          clearInterval(interval);
        }
      }, 180);
      const result = (await this.instance.post('/accompaniment', { bpm, chords })) as unknown as Accompaniment;
      clearInterval(interval);
      onProgress(100);
      return result;
    }
    return this.instance.post('/accompaniment', { bpm, chords });
  }

  async saveArchive(archive: Omit<MelodyArchive, 'id' | 'createdAt'>): Promise<{ success: boolean; archive: MelodyArchive }> {
    return this.instance.post('/save', archive);
  }

  async loadArchives(): Promise<MelodyArchive[]> {
    return this.instance.get('/load');
  }

  async loadArchive(id: string): Promise<MelodyArchive> {
    return this.instance.get(`/load/${id}`);
  }
}

export const apiService = new ApiService();
export default apiService;
