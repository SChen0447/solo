import axios from 'axios';

export interface EarthquakeData {
  id: string;
  lat: number;
  lng: number;
  depth: number;
  magnitude: number;
  place: string;
  time: number;
}

const USGS_API_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson';
const MAX_EVENTS = 500;

export async function fetchEarthquakeData(
  minMagnitude: number = 2.5,
  maxEvents: number = MAX_EVENTS
): Promise<EarthquakeData[]> {
  try {
    const response = await axios.get(USGS_API_URL, {
      timeout: 15000,
      headers: {
        'Accept': 'application/geo+json'
      }
    });

    const features = response.data.features || [];

    const earthquakes: EarthquakeData[] = features
      .filter((feature: any) => {
        const mag = feature.properties?.mag;
        return mag !== null && mag !== undefined && mag >= minMagnitude;
      })
      .slice(0, maxEvents)
      .map((feature: any): EarthquakeData => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [0, 0, 0];

        return {
          id: feature.id || `quake-${Date.now()}-${Math.random()}`,
          lng: coords[0],
          lat: coords[1],
          depth: coords[2],
          magnitude: props.mag ?? 0,
          place: props.place || '未知地点',
          time: props.time || Date.now()
        };
      });

    return earthquakes;
  } catch (error) {
    console.error('Failed to fetch earthquake data:', error);
    throw error;
  }
}

export function filterEarthquakes(
  data: EarthquakeData[],
  options: {
    minMagnitude?: number;
    shallow?: boolean;
    mid?: boolean;
    deep?: boolean;
  }
): EarthquakeData[] {
  const {
    minMagnitude = 0,
    shallow = true,
    mid = true,
    deep = true
  } = options;

  return data.filter((quake) => {
    if (quake.magnitude < minMagnitude) return false;

    const depth = quake.depth;
    if (depth < 70 && !shallow) return false;
    if (depth >= 70 && depth <= 300 && !mid) return false;
    if (depth > 300 && !deep) return false;

    return true;
  });
}

export function groupEarthquakesByDay(data: EarthquakeData[]): Map<string, EarthquakeData[]> {
  const dayMap = new Map<string, EarthquakeData[]>();

  data.forEach((quake) => {
    const date = new Date(quake.time);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, []);
    }
    dayMap.get(dayKey)!.push(quake);
  });

  const sortedKeys = Array.from(dayMap.keys()).sort();
  const sortedMap = new Map<string, EarthquakeData[]>();
  sortedKeys.forEach((key) => {
    sortedMap.set(key, dayMap.get(key)!);
  });

  return sortedMap;
}
