export interface IStarData {
  name: string;
  ra: number;
  dec: number;
  magnitude: number;
  distance: number;
  spectralType: string;
  properMotionRA: number;
  properMotionDec: number;
  constellation: string;
}

export interface IConstellationLine {
  name: string;
  starNames: string[];
  color: { r: number; g: number; b: number };
}

const SPECTRAL_COLORS: Record<string, { r: number; g: number; b: number }> = {
  O: { r: 0.67, g: 0.80, b: 1.0 },
  B: { r: 0.70, g: 0.82, b: 1.0 },
  A: { r: 0.85, g: 0.90, b: 1.0 },
  F: { r: 1.0, g: 1.0, b: 0.90 },
  G: { r: 1.0, g: 0.96, b: 0.72 },
  K: { r: 1.0, g: 0.72, b: 0.42 },
  M: { r: 1.0, g: 0.40, b: 0.20 },
};

export class StarSystem {
  stars: IStarData[];
  constellationLines: IConstellationLine[];
  private starMap: Map<string, IStarData>;

  constructor() {
    this.stars = this.createStarData();
    this.starMap = new Map(this.stars.map((s) => [s.name, s]));
    this.constellationLines = this.createConstellationLines();
  }

  getStarByName(name: string): IStarData | undefined {
    return this.starMap.get(name);
  }

  getStarsByConstellation(constellation: string): IStarData[] {
    return this.stars.filter((s) => s.constellation === constellation);
  }

  getStarColor(spectralType: string): { r: number; g: number; b: number } {
    const classKey = spectralType.charAt(0).toUpperCase();
    return SPECTRAL_COLORS[classKey] || SPECTRAL_COLORS['G'];
  }

  getStarSize(magnitude: number): number {
    const clampedMag = Math.max(-1.5, Math.min(6.0, magnitude));
    return 0.2 + (1.5 - 0.2) * (1.0 - (clampedMag + 1.5) / 7.5);
  }

  getAdjustedPosition(
    star: IStarData,
    yearOffset: number
  ): { x: number; y: number; z: number } {
    const sphereRadius = 100;
    const raRad = (star.ra * Math.PI) / 180;
    const decRad = (star.dec * Math.PI) / 180;

    const pmRA = (star.properMotionRA * yearOffset) / 3600000;
    const pmDec = (star.properMotionDec * yearOffset) / 3600000;

    const adjustedRA = raRad + (pmRA * Math.PI) / 180;
    const adjustedDec = decRad + (pmDec * Math.PI) / 180;
    const clampedDec = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, adjustedDec));

    const x = sphereRadius * Math.cos(clampedDec) * Math.cos(adjustedRA);
    const y = sphereRadius * Math.sin(clampedDec);
    const z = -sphereRadius * Math.cos(clampedDec) * Math.sin(adjustedRA);

    return { x, y, z };
  }

  getAdjustedMagnitude(star: IStarData, yearOffset: number): number {
    const distMod = (star.distance * 0.0001 * Math.abs(yearOffset)) / 1000;
    return star.magnitude + distMod * (yearOffset > 0 ? 1 : -1) * 0.1;
  }

  private createStarData(): IStarData[] {
    return [
      { name: 'Aldebaran', ra: 68.98, dec: 16.51, magnitude: 0.85, distance: 65.3, spectralType: 'K5III', properMotionRA: 62.78, properMotionDec: -189.35, constellation: 'Taurus' },
      { name: 'Elnath', ra: 81.28, dec: 28.61, magnitude: 1.65, distance: 131.0, spectralType: 'B7III', properMotionRA: 23.28, properMotionDec: -174.22, constellation: 'Taurus' },
      { name: 'Alcyone', ra: 56.87, dec: 24.11, magnitude: 2.87, distance: 410.0, spectralType: 'B7III', properMotionRA: 19.35, properMotionDec: -45.41, constellation: 'Taurus' },
      { name: 'Zeta Tauri', ra: 84.41, dec: 21.14, magnitude: 3.03, distance: 417.0, spectralType: 'B4IV', properMotionRA: -1.03, properMotionDec: -21.56, constellation: 'Taurus' },
      { name: 'Theta Tauri', ra: 66.66, dec: 15.87, magnitude: 3.40, distance: 149.0, spectralType: 'G7III', properMotionRA: 72.93, properMotionDec: -44.29, constellation: 'Taurus' },
      { name: 'Regulus', ra: 152.09, dec: 11.97, magnitude: 1.35, distance: 77.5, spectralType: 'B8IV', properMotionRA: -249.40, properMotionDec: 4.91, constellation: 'Leo' },
      { name: 'Denebola', ra: 177.26, dec: 14.57, magnitude: 2.13, distance: 35.9, spectralType: 'A3V', properMotionRA: -499.02, properMotionDec: -113.78, constellation: 'Leo' },
      { name: 'Algieba', ra: 154.99, dec: 19.84, magnitude: 2.28, distance: 130.0, spectralType: 'K1III', properMotionRA: 310.77, properMotionDec: -152.88, constellation: 'Leo' },
      { name: 'Zosma', ra: 168.53, dec: 20.52, magnitude: 2.56, distance: 58.0, spectralType: 'A4V', properMotionRA: -136.46, properMotionDec: -118.10, constellation: 'Leo' },
      { name: 'Chertan', ra: 168.56, dec: 15.43, magnitude: 3.34, distance: 165.0, spectralType: 'A2V', properMotionRA: -60.31, properMotionDec: -69.90, constellation: 'Leo' },
      { name: 'Spica', ra: 201.30, dec: -11.16, magnitude: 0.97, distance: 250.0, spectralType: 'B1V', properMotionRA: -42.50, properMotionDec: -31.73, constellation: 'Virgo' },
      { name: 'Porrima', ra: 190.42, dec: -1.45, magnitude: 2.74, distance: 38.0, spectralType: 'F0V', properMotionRA: 615.87, properMotionDec: -56.51, constellation: 'Virgo' },
      { name: 'Vindemiatrix', ra: 195.54, dec: 10.96, magnitude: 2.83, distance: 110.0, spectralType: 'G8III', properMotionRA: -283.71, properMotionDec: 19.76, constellation: 'Virgo' },
      { name: 'Zeta Virginis', ra: 194.91, dec: -0.67, magnitude: 3.37, distance: 74.0, spectralType: 'A3V', properMotionRA: -131.33, properMotionDec: -63.46, constellation: 'Virgo' },
      { name: 'Zubenelgenubi', ra: 222.72, dec: -16.04, magnitude: 2.75, distance: 77.0, spectralType: 'A3IV', properMotionRA: -106.02, properMotionDec: -68.47, constellation: 'Libra' },
      { name: 'Zubeneschamali', ra: 229.25, dec: -9.38, magnitude: 2.61, distance: 185.0, spectralType: 'B8V', properMotionRA: -99.69, properMotionDec: -20.22, constellation: 'Libra' },
      { name: 'Sigma Librae', ra: 233.98, dec: -25.28, magnitude: 3.29, distance: 288.0, spectralType: 'M3III', properMotionRA: -28.17, properMotionDec: -43.40, constellation: 'Libra' },
      { name: 'Antares', ra: 247.35, dec: -26.43, magnitude: 1.09, distance: 550.0, spectralType: 'M1Ib', properMotionRA: -10.16, properMotionDec: -23.21, constellation: 'Scorpius' },
      { name: 'Shaula', ra: 263.40, dec: -37.10, magnitude: 1.63, distance: 570.0, spectralType: 'B2IV', properMotionRA: -8.90, properMotionDec: -29.95, constellation: 'Scorpius' },
      { name: 'Sargas', ra: 260.45, dec: -42.99, magnitude: 1.87, distance: 270.0, spectralType: 'F1II', properMotionRA: 6.86, properMotionDec: -1.80, constellation: 'Scorpius' },
      { name: 'Dschubba', ra: 240.08, dec: -22.62, magnitude: 2.32, distance: 400.0, spectralType: 'B0IV', properMotionRA: -1.15, properMotionDec: -3.51, constellation: 'Scorpius' },
      { name: 'Graffias', ra: 245.31, dec: -19.81, magnitude: 2.62, distance: 530.0, spectralType: 'B1V', properMotionRA: -5.49, properMotionDec: -24.26, constellation: 'Scorpius' },
      { name: 'Kaus Australis', ra: 276.04, dec: -34.38, magnitude: 1.85, distance: 143.0, spectralType: 'B9III', properMotionRA: -39.61, properMotionDec: -124.05, constellation: 'Sagittarius' },
      { name: 'Nunki', ra: 283.82, dec: -26.30, magnitude: 2.02, distance: 228.0, spectralType: 'B2V', properMotionRA: 13.87, properMotionDec: -53.51, constellation: 'Sagittarius' },
      { name: 'Ascella', ra: 290.97, dec: -29.88, magnitude: 2.59, distance: 88.0, spectralType: 'A2IV', properMotionRA: 14.67, properMotionDec: -57.29, constellation: 'Sagittarius' },
      { name: 'Kaus Media', ra: 275.25, dec: -29.83, magnitude: 2.70, distance: 306.0, spectralType: 'K3III', properMotionRA: -36.25, properMotionDec: -42.44, constellation: 'Sagittarius' },
      { name: 'Kaus Borealis', ra: 279.23, dec: -25.42, magnitude: 2.81, distance: 78.0, spectralType: 'K1III', properMotionRA: 31.54, properMotionDec: -63.55, constellation: 'Sagittarius' },
      { name: 'Dabih', ra: 304.51, dec: -14.78, magnitude: 3.08, distance: 330.0, spectralType: 'K0II', properMotionRA: 17.52, properMotionDec: 6.37, constellation: 'Capricornus' },
      { name: 'Deneb Algedi', ra: 326.76, dec: -16.13, magnitude: 2.87, distance: 39.0, spectralType: 'A7III', properMotionRA: 78.50, properMotionDec: -3.71, constellation: 'Capricornus' },
      { name: 'Nashira', ra: 325.02, dec: -16.66, magnitude: 3.68, distance: 139.0, spectralType: 'F0V', properMotionRA: 80.37, properMotionDec: -2.77, constellation: 'Capricornus' },
      { name: 'Sadalsuud', ra: 326.76, dec: -5.57, magnitude: 2.91, distance: 610.0, spectralType: 'G0Ib', properMotionRA: 18.78, properMotionDec: -7.88, constellation: 'Aquarius' },
      { name: 'Sadalmelik', ra: 331.45, dec: -0.32, magnitude: 2.96, distance: 520.0, spectralType: 'G2Ib', properMotionRA: 17.72, properMotionDec: -8.62, constellation: 'Aquarius' },
      { name: 'Skat', ra: 344.41, dec: -15.82, magnitude: 3.27, distance: 190.0, spectralType: 'A3V', properMotionRA: 15.41, properMotionDec: -5.36, constellation: 'Aquarius' },
      { name: 'Eta Aquarii', ra: 338.18, dec: -0.82, magnitude: 4.04, distance: 170.0, spectralType: 'B9V', properMotionRA: 22.74, properMotionDec: -7.12, constellation: 'Aquarius' },
      { name: 'Rasalhague', ra: 258.74, dec: 8.87, magnitude: 2.07, distance: 49.0, spectralType: 'A5III', properMotionRA: 109.99, properMotionDec: -222.64, constellation: 'Ophiuchus' },
      { name: 'Sabik', ra: 256.67, dec: -15.72, magnitude: 2.43, distance: 83.0, spectralType: 'A2V', properMotionRA: 41.16, properMotionDec: 97.65, constellation: 'Ophiuchus' },
      { name: 'Zeta Ophiuchi', ra: 246.86, dec: -10.57, magnitude: 2.56, distance: 460.0, spectralType: 'O9.5V', properMotionRA: 14.99, properMotionDec: 25.40, constellation: 'Ophiuchus' },
      { name: 'Hamal', ra: 31.79, dec: 23.46, magnitude: 2.00, distance: 66.0, spectralType: 'K2III', properMotionRA: 188.72, properMotionDec: -146.74, constellation: 'Aries' },
      { name: 'Sheratan', ra: 28.66, dec: 20.81, magnitude: 2.64, distance: 60.0, spectralType: 'A5V', properMotionRA: 98.02, properMotionDec: -111.08, constellation: 'Aries' },
      { name: 'Mesarthim', ra: 26.01, dec: 19.29, magnitude: 3.86, distance: 160.0, spectralType: 'B9V', properMotionRA: 38.70, properMotionDec: -17.10, constellation: 'Aries' },
      { name: 'Castor', ra: 113.65, dec: 31.89, magnitude: 1.58, distance: 51.0, spectralType: 'A1V', properMotionRA: -206.33, properMotionDec: -148.18, constellation: 'Gemini' },
      { name: 'Pollux', ra: 116.33, dec: 28.03, magnitude: 1.14, distance: 33.8, spectralType: 'K0III', properMotionRA: -625.69, properMotionDec: -45.95, constellation: 'Gemini' },
      { name: 'Alhena', ra: 99.43, dec: 16.40, magnitude: 1.93, distance: 105.0, spectralType: 'A0IV', properMotionRA: -2.63, properMotionDec: -66.88, constellation: 'Gemini' },
      { name: 'Tejat', ra: 97.11, dec: 20.57, magnitude: 2.88, distance: 232.0, spectralType: 'M3III', properMotionRA: 47.27, properMotionDec: -14.77, constellation: 'Gemini' },
      { name: 'Mebsuta', ra: 100.98, dec: 25.13, magnitude: 2.98, distance: 810.0, spectralType: 'G8Ib', properMotionRA: -2.03, properMotionDec: -1.62, constellation: 'Gemini' },
      { name: 'Propus', ra: 95.52, dec: 23.27, magnitude: 3.28, distance: 350.0, spectralType: 'M3III', properMotionRA: 27.15, properMotionDec: -10.18, constellation: 'Gemini' },
      { name: 'Canopus', ra: 95.99, dec: -52.70, magnitude: -0.74, distance: 310.0, spectralType: 'F0II', properMotionRA: 19.99, properMotionDec: 23.67, constellation: 'Pisces' },
      { name: 'Eta Piscium', ra: 345.93, dec: 15.35, magnitude: 3.62, distance: 294.0, spectralType: 'G7III', properMotionRA: 30.89, properMotionDec: -5.01, constellation: 'Pisces' },
      { name: 'Gamma Piscium', ra: 348.96, dec: 5.68, magnitude: 3.69, distance: 150.0, spectralType: 'G9III', properMotionRA: 18.27, properMotionDec: 1.36, constellation: 'Pisces' },
      { name: 'Omega Piscium', ra: 348.80, dec: 6.87, magnitude: 4.03, distance: 106.0, spectralType: 'F4IV', properMotionRA: 96.35, properMotionDec: -37.13, constellation: 'Pisces' },
      { name: 'Iota Piscium', ra: 14.05, dec: 8.49, magnitude: 4.13, distance: 46.0, spectralType: 'F7V', properMotionRA: 131.92, properMotionDec: 16.37, constellation: 'Pisces' },
      { name: 'Cancer_Altarf', ra: 127.62, dec: 9.19, magnitude: 3.52, distance: 290.0, spectralType: 'K4III', properMotionRA: -30.54, properMotionDec: 4.21, constellation: 'Cancer' },
      { name: 'Asellus Borealis', ra: 125.01, dec: 21.47, magnitude: 4.66, distance: 160.0, spectralType: 'A1V', properMotionRA: -11.79, properMotionDec: -10.51, constellation: 'Cancer' },
      { name: 'Asellus Australis', ra: 125.56, dec: 18.15, magnitude: 3.94, distance: 140.0, spectralType: 'K0III', properMotionRA: 18.43, properMotionDec: -24.19, constellation: 'Cancer' },
      { name: 'Acubens', ra: 131.15, dec: 11.97, magnitude: 4.25, distance: 180.0, spectralType: 'A5m', properMotionRA: -13.67, properMotionDec: -34.43, constellation: 'Cancer' },
      { name: 'Leo_Zosma', ra: 168.53, dec: 20.52, magnitude: 2.56, distance: 58.0, spectralType: 'A4V', properMotionRA: -136.46, properMotionDec: -118.10, constellation: 'Leo' },
      { name: 'Theta Leonis', ra: 160.65, dec: 15.43, magnitude: 3.33, distance: 130.0, spectralType: 'A2V', properMotionRA: -51.56, properMotionDec: -70.64, constellation: 'Leo' },
    ];
  }

  private createConstellationLines(): IConstellationLine[] {
    return [
      {
        name: 'Aries',
        starNames: ['Mesarthim', 'Sheratan', 'Hamal'],
        color: { r: 1.0, g: 0.72, b: 0.42 },
      },
      {
        name: 'Taurus',
        starNames: ['Alcyone', 'Theta Tauri', 'Aldebaran', 'Zeta Tauri', 'Elnath'],
        color: { r: 1.0, g: 0.80, b: 0.50 },
      },
      {
        name: 'Gemini',
        starNames: ['Propus', 'Tejat', 'Mebsuta', 'Alhena', 'Castor', 'Pollux'],
        color: { r: 0.85, g: 0.90, b: 1.0 },
      },
      {
        name: 'Cancer',
        starNames: ['Acubens', 'Asellus Borealis', 'Asellus Australis', 'Cancer_Altarf'],
        color: { r: 1.0, g: 0.72, b: 0.42 },
      },
      {
        name: 'Leo',
        starNames: ['Regulus', 'Algieba', 'Chertan', 'Zosma', 'Denebola', 'Theta Leonis'],
        color: { r: 1.0, g: 0.90, b: 0.60 },
      },
      {
        name: 'Virgo',
        starNames: ['Vindemiatrix', 'Porrima', 'Zeta Virginis', 'Spica'],
        color: { r: 1.0, g: 1.0, b: 0.72 },
      },
      {
        name: 'Libra',
        starNames: ['Sigma Librae', 'Zubeneschamali', 'Zubenelgenubi'],
        color: { r: 0.70, g: 0.82, b: 1.0 },
      },
      {
        name: 'Scorpius',
        starNames: ['Graffias', 'Dschubba', 'Antares', 'Sargas', 'Shaula'],
        color: { r: 1.0, g: 0.40, b: 0.20 },
      },
      {
        name: 'Sagittarius',
        starNames: ['Kaus Borealis', 'Kaus Media', 'Kaus Australis', 'Nunki', 'Ascella'],
        color: { r: 0.90, g: 0.75, b: 0.50 },
      },
      {
        name: 'Capricornus',
        starNames: ['Dabih', 'Nashira', 'Deneb Algedi'],
        color: { r: 0.70, g: 0.70, b: 0.80 },
      },
      {
        name: 'Aquarius',
        starNames: ['Sadalsuud', 'Sadalmelik', 'Eta Aquarii', 'Skat'],
        color: { r: 0.60, g: 0.80, b: 1.0 },
      },
      {
        name: 'Pisces',
        starNames: ['Eta Piscium', 'Gamma Piscium', 'Omega Piscium', 'Iota Piscium'],
        color: { r: 0.80, g: 0.85, b: 1.0 },
      },
    ];
  }
}
