export interface TemperatureRecord {
  city: string
  year: number
  month: number
  avgTemp: number
  highTemp: number
  lowTemp: number
}

interface CityClimateProfile {
  name: string
  monthlyAvg: number[]
  monthlyHigh: number[]
  monthlyLow: number[]
  variability: number
}

export const CITY_LIST: string[] = [
  '北京',
  '纽约',
  '伦敦',
  '悉尼',
  '开普敦',
  '里约',
  '东京',
  '迪拜',
  '莫斯科',
  '孟买',
]

export const COLOR_PALETTE: string[] = [
  '#4C72B0',
  '#55A868',
  '#C44E52',
  '#8172B2',
  '#CCB974',
  '#64B5CD',
  '#DD8452',
  '#937860',
  '#8C8C8C',
  '#E377C2',
  '#17BECF',
  '#BCBD22',
]

const CLIMATE_PROFILES: CityClimateProfile[] = [
  {
    name: '北京',
    monthlyAvg: [-3, 0, 7, 15, 22, 26, 28, 26, 21, 13, 5, -1],
    monthlyHigh: [2, 5, 13, 21, 28, 32, 32, 31, 27, 19, 10, 4],
    monthlyLow: [-8, -5, 1, 8, 15, 20, 23, 22, 16, 8, 0, -5],
    variability: 2.5,
  },
  {
    name: '纽约',
    monthlyAvg: [1, 2, 7, 13, 19, 23, 26, 25, 21, 15, 9, 3],
    monthlyHigh: [4, 5, 11, 17, 23, 28, 30, 29, 25, 18, 12, 6],
    monthlyLow: [-3, -2, 2, 8, 14, 19, 22, 21, 17, 11, 5, 0],
    variability: 2.2,
  },
  {
    name: '伦敦',
    monthlyAvg: [5, 5, 8, 10, 14, 17, 19, 19, 16, 12, 8, 5],
    monthlyHigh: [8, 8, 11, 14, 17, 20, 23, 22, 19, 15, 11, 8],
    monthlyLow: [2, 2, 4, 6, 10, 12, 15, 14, 12, 8, 5, 2],
    variability: 1.5,
  },
  {
    name: '悉尼',
    monthlyAvg: [24, 24, 22, 19, 16, 13, 12, 13, 15, 18, 20, 23],
    monthlyHigh: [26, 26, 25, 22, 19, 17, 16, 17, 19, 21, 23, 25],
    monthlyLow: [19, 20, 18, 15, 12, 9, 8, 9, 11, 13, 16, 18],
    variability: 1.8,
  },
  {
    name: '开普敦',
    monthlyAvg: [22, 22, 21, 18, 15, 13, 12, 13, 14, 16, 18, 21],
    monthlyHigh: [26, 27, 26, 24, 21, 19, 18, 18, 19, 21, 23, 25],
    monthlyLow: [17, 17, 16, 13, 10, 8, 7, 8, 9, 11, 14, 16],
    variability: 1.8,
  },
  {
    name: '里约',
    monthlyAvg: [27, 27, 26, 24, 22, 21, 20, 21, 22, 23, 25, 26],
    monthlyHigh: [31, 32, 31, 29, 27, 26, 26, 26, 26, 27, 28, 30],
    monthlyLow: [23, 23, 23, 21, 19, 18, 17, 18, 18, 19, 21, 22],
    variability: 1.5,
  },
  {
    name: '东京',
    monthlyAvg: [6, 7, 10, 15, 20, 23, 26, 27, 23, 18, 13, 8],
    monthlyHigh: [10, 10, 14, 19, 24, 27, 30, 31, 27, 22, 17, 12],
    monthlyLow: [2, 3, 6, 11, 16, 20, 23, 24, 20, 15, 9, 4],
    variability: 2.0,
  },
  {
    name: '迪拜',
    monthlyAvg: [21, 22, 25, 30, 34, 36, 37, 36, 34, 30, 26, 22],
    monthlyHigh: [24, 25, 28, 33, 38, 40, 41, 41, 39, 35, 30, 26],
    monthlyLow: [15, 16, 19, 23, 27, 29, 31, 30, 28, 24, 20, 16],
    variability: 2.0,
  },
  {
    name: '莫斯科',
    monthlyAvg: [-8, -7, -2, 7, 14, 18, 20, 18, 12, 5, -1, -6],
    monthlyHigh: [-4, -3, 3, 12, 19, 23, 25, 23, 16, 8, 1, -3],
    monthlyLow: [-12, -11, -7, 2, 8, 13, 15, 13, 7, 1, -4, -9],
    variability: 3.0,
  },
  {
    name: '孟买',
    monthlyAvg: [25, 26, 28, 30, 31, 29, 28, 27, 28, 29, 28, 26],
    monthlyHigh: [31, 32, 33, 33, 34, 32, 30, 30, 31, 33, 33, 32],
    monthlyLow: [19, 20, 23, 26, 28, 26, 25, 25, 25, 25, 23, 20],
    variability: 1.5,
  },
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function generateTemperatureData(): TemperatureRecord[] {
  const records: TemperatureRecord[] = []
  const random = seededRandom(42)

  for (const profile of CLIMATE_PROFILES) {
    for (let year = 2000; year <= 2020; year++) {
      for (let month = 0; month < 12; month++) {
        const yearShift = (year - 2000) * 0.05
        const noise = (random() - 0.5) * profile.variability

        const avgTemp = +(
          profile.monthlyAvg[month] +
          yearShift +
          noise
        ).toFixed(1)
        const highTemp = +(
          profile.monthlyHigh[month] +
          yearShift +
          (random() - 0.5) * profile.variability +
          1
        ).toFixed(1)
        const lowTemp = +(
          profile.monthlyLow[month] +
          yearShift +
          (random() - 0.5) * profile.variability -
          1
        ).toFixed(1)

        records.push({
          city: profile.name,
          year,
          month: month + 1,
          avgTemp,
          highTemp,
          lowTemp,
        })
      }
    }
  }

  return records
}

const ALL_DATA: TemperatureRecord[] = generateTemperatureData()

export function getAllTemperatureData(): TemperatureRecord[] {
  return ALL_DATA
}

export function getFilteredData(
  cities: string[],
  startYear?: number,
  endYear?: number,
  startMonth?: number,
  endMonth?: number
): TemperatureRecord[] {
  return ALL_DATA.filter((r) => {
    if (cities.length > 0 && !cities.includes(r.city)) return false
    if (startYear !== undefined && r.year < startYear) return false
    if (endYear !== undefined && r.year > endYear) return false
    if (startMonth !== undefined && endMonth !== undefined) {
      if (startMonth <= endMonth) {
        if (r.month < startMonth || r.month > endMonth) return false
      } else {
        if (r.month < startMonth && r.month > endMonth) return false
      }
    }
    return true
  })
}

export function getDataByCity(city: string): TemperatureRecord[] {
  return ALL_DATA.filter((r) => r.city === city)
}

export function getDataByCityAndYear(
  city: string,
  year: number
): TemperatureRecord[] {
  return ALL_DATA.filter((r) => r.city === city && r.year === year)
}

export function getCityColor(city: string): string {
  const idx = CITY_LIST.indexOf(city)
  return COLOR_PALETTE[idx % COLOR_PALETTE.length]
}
