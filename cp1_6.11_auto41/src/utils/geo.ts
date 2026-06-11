export const latLngToXY = (
  lat: number,
  lng: number,
  width: number,
  height: number,
  scale: number = 1
): { x: number; y: number } => {
  const x = ((lng + 180) / 360) * width * scale;
  const y = ((90 - lat) / 180) * height * scale;
  return { x, y };
};

export const xyToLatLng = (
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number = 1
): { lat: number; lng: number } => {
  const lng = (x / (width * scale)) * 360 - 180;
  const lat = 90 - (y / (height * scale)) * 180;
  return { lat, lng };
};

export const getColorByLatitude = (lat: number): string => {
  const normalizedLat = Math.abs(lat) / 90;
  const polarColor = { r: 70, g: 130, b: 180 };
  const equatorColor = { r: 230, g: 110, b: 60 };
  
  const r = Math.round(equatorColor.r + (polarColor.r - equatorColor.r) * normalizedLat);
  const g = Math.round(equatorColor.g + (polarColor.g - equatorColor.g) * normalizedLat);
  const b = Math.round(equatorColor.b + (polarColor.b - equatorColor.b) * normalizedLat);
  
  return `rgb(${r}, ${g}, ${b})`;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};
