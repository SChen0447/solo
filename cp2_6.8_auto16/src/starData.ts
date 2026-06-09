export interface StarData {
  id: number;
  name: string;
  position: [number, number, number];
  magnitude: number;
  brightness: number;
  colorType: number;
  color: string;
  distance: number;
}

const STAR_NAMES = [
  'Sirius', 'Canopus', 'Rigil Kentaurus', 'Arcturus', 'Vega',
  'Capella', 'Rigel', 'Procyon', 'Betelgeuse', 'Achernar',
  'Hadar', 'Altair', 'Aldebaran', 'Spica', 'Antares',
  'Pollux', 'Fomalhaut', 'Deneb', 'Regulus', 'Bellatrix',
  'Alnilam', 'Alnitak', 'Mintaka', 'Saiph', 'Polaris',
  'Dubhe', 'Merak', 'Phecda', 'Megrez', 'Alioth',
  'Mizar', 'Alkaid', 'Sargas', 'Kaus Australis', 'Shaula',
  'Lesath', 'Scheat', 'Markab', 'Algenib', 'Mirfak',
  'Algol', 'Electra', 'Taygeta', 'Maia', 'Asterope',
  'Celaeno', 'Alcyone', 'Merope', 'Atlas', 'Pleione',
  'Aldebaran', 'Rigel', 'Capella', 'Vega', 'Arcturus',
  'Procyon', 'Betelgeuse', 'Achernar', 'Hadar', 'Altair'
];

const COLOR_PALETTE = [
  '#aaccff', '#bbddff', '#ccddee', '#ddeeff', '#fffaf0',
  '#fff5e6', '#ffedd5', '#ffe0b2', '#ffcc99', '#ffaa77',
  '#ff9966', '#ff8855', '#ff8844', '#ff7733', '#ff6622'
];

function generateStarName(index: number): string {
  if (index < STAR_NAMES.length) {
    return STAR_NAMES[index];
  }
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
  const constellations = ['Cygni', 'Lyrae', 'Orionis', 'Tauri', 'Leonis', 'Ursae', 'Draconis', 'Scorpii'];
  const prefix = prefixes[index % prefixes.length];
  const constellation = constellations[Math.floor(index / prefixes.length) % constellations.length];
  const num = Math.floor(index / (prefixes.length * constellations.length)) + 1;
  return `${prefix} ${constellation} ${num}`;
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateSphericalPosition(minRadius: number, maxRadius: number): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = randomInRange(minRadius, maxRadius);

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);

  return [x, y, z];
}

function magnitudeToBrightness(magnitude: number): number {
  const minMag = -1;
  const maxMag = 6;
  const normalized = (maxMag - magnitude) / (maxMag - minMag);
  return Math.max(0.05, Math.min(1, normalized));
}

function getColorByTemperature(tempType: number): string {
  const index = Math.min(COLOR_PALETTE.length - 1, Math.max(0, Math.floor(tempType * COLOR_PALETTE.length)));
  return COLOR_PALETTE[index];
}

export function generateStars(count: number = 500, minRadius: number = 100, maxRadius: number = 500): StarData[] {
  const stars: StarData[] = [];

  const brightStarCount = Math.floor(count * 0.05);
  for (let i = 0; i < brightStarCount; i++) {
    const position = generateSphericalPosition(minRadius, maxRadius * 0.5);
    const distance = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
    const magnitude = randomInRange(-1, 2);
    const colorType = randomInRange(0, 1);

    stars.push({
      id: i,
      name: generateStarName(i),
      position,
      magnitude,
      brightness: magnitudeToBrightness(magnitude),
      colorType,
      color: getColorByTemperature(colorType),
      distance
    });
  }

  for (let i = brightStarCount; i < count; i++) {
    const position = generateSphericalPosition(minRadius, maxRadius);
    const distance = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
    const distanceFactor = (distance - minRadius) / (maxRadius - minRadius);
    const baseMagnitude = 2 + distanceFactor * 4;
    const magnitude = baseMagnitude + randomInRange(-0.5, 0.5);
    const colorType = randomInRange(0.2, 0.9);

    stars.push({
      id: i,
      name: generateStarName(i),
      position,
      magnitude: Math.min(6, Math.max(-1, magnitude)),
      brightness: magnitudeToBrightness(Math.min(6, Math.max(-1, magnitude))),
      colorType,
      color: getColorByTemperature(colorType),
      distance
    });
  }

  return stars;
}

export const stars = generateStars(500, 100, 500);

export function getStarByName(name: string): StarData | undefined {
  return stars.find(
    s => s.name.toLowerCase() === name.toLowerCase()
  );
}

export function searchStars(query: string): StarData[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return stars
    .filter(s => s.name.toLowerCase().includes(lowerQuery))
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, 10);
}
