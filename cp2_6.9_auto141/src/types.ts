export interface VideoSegment {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  filter: string;
}

export type FilterType = 'none' | 'grayscale' | 'sepia' | 'film';

export const FILTER_OPTIONS: { value: FilterType; label: string; css: string }[] = [
  { value: 'none', label: '无', css: 'none' },
  { value: 'grayscale', label: '黑白', css: 'grayscale(100%)' },
  { value: 'sepia', label: '复古', css: 'sepia(80%)' },
  { value: 'film', label: '胶片', css: 'contrast(120%) brightness(90%)' }
];
