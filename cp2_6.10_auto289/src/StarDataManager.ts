export type Constellation = 'UrsaMajor' | 'Orion' | 'Other';

export interface Star {
  id: string;
  name: string;
  nameZh: string;
  ra: number;
  dec: number;
  magnitude: number;
  constellation: Constellation;
}

export interface StarDataset {
  id: 'ptolemy' | 'islamic' | 'tycho';
  name: string;
  year: number;
  description: string;
  stars: Star[];
}

export interface StarCoordinates {
  altitude: number;
  azimuth: number;
  hourAngle: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const ursaMajorStars: Omit<Star, 'ra' | 'dec'>[] = [
  { id: 'uma-1', name: 'Dubhe', nameZh: '天枢', magnitude: 1.79, constellation: 'UrsaMajor' },
  { id: 'uma-2', name: 'Merak', nameZh: '天璇', magnitude: 2.37, constellation: 'UrsaMajor' },
  { id: 'uma-3', name: 'Phecda', nameZh: '天玑', magnitude: 2.44, constellation: 'UrsaMajor' },
  { id: 'uma-4', name: 'Megrez', nameZh: '天权', magnitude: 3.31, constellation: 'UrsaMajor' },
  { id: 'uma-5', name: 'Alioth', nameZh: '玉衡', magnitude: 1.77, constellation: 'UrsaMajor' },
  { id: 'uma-6', name: 'Mizar', nameZh: '开阳', magnitude: 2.04, constellation: 'UrsaMajor' },
  { id: 'uma-7', name: 'Alkaid', nameZh: '摇光', magnitude: 1.86, constellation: 'UrsaMajor' },
];

const orionStars: Omit<Star, 'ra' | 'dec'>[] = [
  { id: 'ori-1', name: 'Betelgeuse', nameZh: '参宿四', magnitude: 0.42, constellation: 'Orion' },
  { id: 'ori-2', name: 'Bellatrix', nameZh: '参宿五', magnitude: 1.64, constellation: 'Orion' },
  { id: 'ori-3', name: 'Alnitak', nameZh: '参宿一', magnitude: 1.77, constellation: 'Orion' },
  { id: 'ori-4', name: 'Alnilam', nameZh: '参宿二', magnitude: 1.69, constellation: 'Orion' },
  { id: 'ori-5', name: 'Mintaka', nameZh: '参宿三', magnitude: 2.23, constellation: 'Orion' },
  { id: 'ori-6', name: 'Saiph', nameZh: '参宿六', magnitude: 2.07, constellation: 'Orion' },
  { id: 'ori-7', name: 'Rigel', nameZh: '参宿七', magnitude: 0.13, constellation: 'Orion' },
];

function createStars(
  baseUrsaRa: number[],
  baseUrsaDec: number[],
  baseOriRa: number[],
  baseOriDec: number[],
  raOffset: number,
  decOffset: number
): Star[] {
  const stars: Star[] = [];
  ursaMajorStars.forEach((s, i) => {
    stars.push({
      ...s,
      ra: baseUrsaRa[i] + raOffset,
      dec: baseUrsaDec[i] + decOffset,
    });
  });
  orionStars.forEach((s, i) => {
    stars.push({
      ...s,
      ra: baseOriRa[i] + raOffset,
      dec: baseOriDec[i] + decOffset,
    });
  });
  return stars;
}

const ursaMajorRaModern = [165.46, 167.06, 170.69, 173.53, 176.39, 178.59, 181.96];
const ursaMajorDecModern = [61.75, 56.38, 53.69, 57.03, 55.96, 54.92, 49.31];
const orionRaModern = [88.79, 128.25, 140.74, 142.54, 144.71, 152.96, 131.22];
const orionDecModern = [7.41, 6.35, -1.94, -1.20, -0.30, -9.67, -8.20];

const PRECESSION_PER_YEAR_RA = 0.01397;
const PRECESSION_PER_YEAR_DEC = 0.00495;

function precess(modernRa: number, modernDec: number, targetYear: number): { ra: number; dec: number } {
  const deltaYears = 2000 - targetYear;
  return {
    ra: modernRa - PRECESSION_PER_YEAR_RA * deltaYears,
    dec: modernDec + PRECESSION_PER_YEAR_DEC * deltaYears,
  };
}

function createDatasetStars(year: number, raJitter: number, decJitter: number): Star[] {
  const stars: Star[] = [];
  ursaMajorStars.forEach((s, i) => {
    const precessed = precess(ursaMajorRaModern[i], ursaMajorDecModern[i], year);
    stars.push({
      ...s,
      ra: precessed.ra + (Math.random() - 0.5) * raJitter,
      dec: precessed.dec + (Math.random() - 0.5) * decJitter,
    });
  });
  orionStars.forEach((s, i) => {
    const precessed = precess(orionRaModern[i], orionDecModern[i], year);
    stars.push({
      ...s,
      ra: precessed.ra + (Math.random() - 0.5) * raJitter,
      dec: precessed.dec + (Math.random() - 0.5) * decJitter,
    });
  });
  return stars;
}

const ptolemyDataset: StarDataset = {
  id: 'ptolemy',
  name: '托勒密星表',
  year: 150,
  description: '克劳狄乌斯·托勒密《天文学大成》中收录的星表，共1028颗恒星，是西方古代最完整的星表，影响了天文学千年之久。',
  stars: createDatasetStars(150, 2.5, 1.2),
};

const islamicDataset: StarDataset = {
  id: 'islamic',
  name: '伊斯兰星表',
  year: 1000,
  description: '中世纪阿拉伯天文学家在巴格达与马拉盖天文台修订的星表，在托勒密基础上修正了岁差参数，精度显著提高。',
  stars: createDatasetStars(1000, 0.8, 0.4),
};

const tychoDataset: StarDataset = {
  id: 'tycho',
  name: '第谷星表',
  year: 1600,
  description: '丹麦天文学家第谷·布拉赫用裸眼仪器观测的高精度星表，含777颗恒星，精度达到1弧分，为开普勒定律奠定基础。',
  stars: createDatasetStars(1600, 0.15, 0.08),
};

export class StarDataManager {
  public datasets: Record<string, StarDataset>;
  public currentDatasetId: string;
  private observerLatitude: number;

  constructor() {
    this.datasets = {
      ptolemy: ptolemyDataset,
      islamic: islamicDataset,
      tycho: tychoDataset,
    };
    this.currentDatasetId = 'ptolemy';
    this.observerLatitude = 40.0;
  }

  setDataset(id: string): StarDataset {
    if (this.datasets[id]) {
      this.currentDatasetId = id;
    }
    return this.datasets[this.currentDatasetId];
  }

  getCurrentDataset(): StarDataset {
    return this.datasets[this.currentDatasetId];
  }

  getConstellationStars(constellation: Constellation): Star[] {
    return this.getCurrentDataset().stars.filter((s) => s.constellation === constellation);
  }

  private getJulianDate(date: Date): number {
    return date.getTime() / 86400000 + 2440587.5;
  }

  private getGMST(timeHours: number, jd: number): number {
    const d = jd - 2451545.0;
    const T = d / 36525.0;
    let gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T;
    gmst = ((gmst % 360) + 360) % 360;
    gmst += timeHours * 15;
    return ((gmst % 360) + 360) % 360;
  }

  calculateStarPosition(
    star: Star,
    date: Date,
    timeHours: number,
    observerLat: number = this.observerLatitude
  ): StarCoordinates {
    const jd = this.getJulianDate(date);
    const gmst = this.getGMST(timeHours, jd);
    const lst = gmst;

    let hourAngle = lst - star.ra;
    hourAngle = ((hourAngle % 360) + 540) % 360 - 180;

    const raRad = star.ra * DEG_TO_RAD;
    const decRad = star.dec * DEG_TO_RAD;
    const haRad = hourAngle * DEG_TO_RAD;
    const latRad = observerLat * DEG_TO_RAD;

    const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
                    Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD_TO_DEG;

    const cosAz = (Math.sin(decRad) - Math.sin(altitude * DEG_TO_RAD) * Math.sin(latRad)) /
                  (Math.cos(altitude * DEG_TO_RAD) * Math.cos(latRad));
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD_TO_DEG;

    if (Math.sin(haRad) > 0) {
      azimuth = 360 - azimuth;
    }

    return {
      altitude,
      azimuth,
      hourAngle: ((hourAngle % 360) + 360) % 360,
    };
  }

  getSiderealTime(date: Date, timeHours: number): number {
    const jd = this.getJulianDate(date);
    return this.getGMST(timeHours, jd);
  }
}

export const starDataManager = new StarDataManager();
