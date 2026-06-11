export type CodeTab = 'html' | 'css' | 'js';

export interface CodeSnippets {
  html: string;
  css: string;
  js: string;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceSize {
  width: number;
  height: number;
}

export const DEVICE_SIZES: Record<DeviceType, DeviceSize> = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 }
};
