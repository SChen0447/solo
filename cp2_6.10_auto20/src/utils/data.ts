export interface CarbonEmission {
  country: string;
  continent: string;
  year: number;
  month: number;
  value: number;
}

export interface CountryYearTotal {
  country: string;
  continent: string;
  year: number;
  total: number;
}

export interface YearlyValue {
  year: number;
  value: number;
}

interface CountryProfile {
  name: string;
  continent: string;
  baseEmission: number;
  growthRate: number;
  volatility: number;
}

const COUNTRY_PROFILES: CountryProfile[] = [
  { name: '中国', continent: '亚洲', baseEmission: 3200, growthRate: 0.045, volatility: 0.08 },
  { name: '美国', continent: '北美洲', baseEmission: 5200, growthRate: 0.005, volatility: 0.06 },
  { name: '印度', continent: '亚洲', baseEmission: 1100, growthRate: 0.055, volatility: 0.09 },
  { name: '俄罗斯', continent: '欧洲', baseEmission: 1700, growthRate: 0.012, volatility: 0.07 },
  { name: '日本', continent: '亚洲', baseEmission: 1300, growthRate: -0.003, volatility: 0.05 },
  { name: '德国', continent: '欧洲', baseEmission: 900, growthRate: -0.015, volatility: 0.05 },
  { name: '巴西', continent: '南美洲', baseEmission: 450, growthRate: 0.02, volatility: 0.1 },
  { name: '加拿大', continent: '北美洲', baseEmission: 620, growthRate: 0.008, volatility: 0.07 },
  { name: '英国', continent: '欧洲', baseEmission: 550, growthRate: -0.02, volatility: 0.06 },
  { name: '澳大利亚', continent: '大洋洲', baseEmission: 420, growthRate: 0.01, volatility: 0.08 },
];

export const CONTINENTS = ['亚洲', '欧洲', '北美洲', '南美洲', '大洋洲'];

export const ALL_COUNTRIES = COUNTRY_PROFILES.map((p) => p.name);

const YEAR_START = 2000;
const YEAR_END = 2020;

function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateMockData(): CarbonEmission[] {
  const data: CarbonEmission[] = [];
  const rand = seededRandom(20240610);

  for (const profile of COUNTRY_PROFILES) {
    for (let year = YEAR_START; year <= YEAR_END; year++) {
      const yearsSinceStart = year - YEAR_START;
      const yearFactor = 1 + profile.growthRate * yearsSinceStart;
      const annualBase = profile.baseEmission * yearFactor;

      for (let month = 1; month <= 12; month++) {
        const seasonalFactor = 1 + 0.1 * Math.sin((month / 12) * Math.PI * 2);
        const randomFactor = 1 + (rand() - 0.5) * 2 * profile.volatility;
        const monthlyValue = (annualBase / 12) * seasonalFactor * randomFactor;

        data.push({
          country: profile.name,
          continent: profile.continent,
          year,
          month,
          value: Math.round(monthlyValue * 10) / 10,
        });
      }
    }
  }

  return data;
}

export function filterByYear(data: CarbonEmission[], year: number): CarbonEmission[] {
  return data.filter((d) => d.year === year);
}

export function filterByContinents(
  data: CarbonEmission[],
  continents: string[]
): CarbonEmission[] {
  if (continents.length === 0) return data;
  return data.filter((d) => continents.includes(d.continent));
}

export function filterByCountry(data: CarbonEmission[], country: string): CarbonEmission[] {
  return data.filter((d) => d.country === country);
}

export function aggregateByCountryYear(data: CarbonEmission[]): CountryYearTotal[] {
  const map = new Map<string, CountryYearTotal>();

  for (const d of data) {
    const key = `${d.country}-${d.year}`;
    if (!map.has(key)) {
      map.set(key, {
        country: d.country,
        continent: d.continent,
        year: d.year,
        total: 0,
      });
    }
    const entry = map.get(key)!;
    entry.total += d.value;
  }

  const result = Array.from(map.values());
  result.sort((a, b) => b.total - a.total);
  for (const r of result) {
    r.total = Math.round(r.total * 10) / 10;
  }
  return result;
}

export function getCountryTimeSeries(
  data: CarbonEmission[],
  country: string
): YearlyValue[] {
  const countryData = filterByCountry(data, country);
  const aggregated = aggregateByCountryYear(countryData);
  aggregated.sort((a, b) => a.year - b.year);
  return aggregated.map((d) => ({ year: d.year, value: d.total }));
}

export function getCountriesInContinents(continents: string[]): string[] {
  if (continents.length === 0) return ALL_COUNTRIES;
  return COUNTRY_PROFILES.filter((p) => continents.includes(p.continent)).map((p) => p.name);
}

export const YEAR_RANGE = { min: YEAR_START, max: YEAR_END };
