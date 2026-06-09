import type { StarData, SpectralType, StarFilterOptions } from '../types/star';

const STAR_NAMES = [
  '天狼星', '老人星', '大角星', '织女星', '五车二', '参宿七', '南河三', '水委一',
  '马腹一', '河鼓二', '参宿四', '毕宿五', '十字架二', '角宿一', '心宿二', '室女座',
  '北河三', '北落师门', '天津四', '轩辕十四', '南门二', '老人星', '天枢', '天璇',
  '天玑', '天权', '玉衡', '开阳', '摇光', '北极星', '太阳', '比邻星',
  'Barnard\'s Star', 'Wolf 359', 'Lalande 21185', 'Sirius B', 'Luyten 726-8',
  'Ross 154', 'Ross 248', 'ε Eridani', 'Lacaille 9352', 'τ Ceti',
];

export class StarDataManager {
  public stars: StarData[] = [];

  constructor() {}

  public loadStars(count: number = 2000): StarData[] {
    const stars: StarData[] = [];
    const spectralTypes: SpectralType[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

    const spectralWeights = [0.003, 0.013, 0.06, 0.15, 0.25, 0.28, 0.244];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const u = Math.random();
      const radius = 500 * Math.cbrt(u);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const distance = radius;

      const rand = Math.random();
      let cumulative = 0;
      let spectralType: SpectralType = 'G';
      for (let j = 0; j < spectralTypes.length; j++) {
        cumulative += spectralWeights[j];
        if (rand <= cumulative) {
          spectralType = spectralTypes[j];
          break;
        }
      }

      let baseMag: number;
      switch (spectralType) {
        case 'O': baseMag = -5 + Math.random() * 3; break;
        case 'B': baseMag = -2 + Math.random() * 4; break;
        case 'A': baseMag = 0 + Math.random() * 3; break;
        case 'F': baseMag = 2 + Math.random() * 2; break;
        case 'G': baseMag = 4 + Math.random() * 2; break;
        case 'K': baseMag = 5 + Math.random() * 2; break;
        case 'M': baseMag = 6 + Math.random() * 4; break;
      }

      const distFactor = 5 * Math.log10(distance / 10);
      const apparentMag = Math.max(-2, Math.min(12, baseMag + distFactor));

      const name = i < STAR_NAMES.length ? STAR_NAMES[i] : undefined;

      stars.push({
        id: i,
        name,
        x,
        y,
        z,
        magnitude: parseFloat(apparentMag.toFixed(2)),
        distance: parseFloat(distance.toFixed(1)),
        spectralType,
      });
    }

    this.stars = stars;
    return stars;
  }

  public sortByDistance(): StarData[] {
    return [...this.stars].sort((a, b) => a.distance - b.distance);
  }

  public sortByMagnitude(): StarData[] {
    return [...this.stars].sort((a, b) => a.magnitude - b.magnitude);
  }

  public filter(options: StarFilterOptions): StarData[] {
    return this.stars.filter(
      (s) =>
        s.magnitude <= options.magnitudeThreshold &&
        s.distance >= options.minDistance &&
        s.distance <= options.maxDistance
    );
  }
}
