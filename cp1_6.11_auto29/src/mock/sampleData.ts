import type { RawInputData, MatchData } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SC2_UNITS = {
  Terran: ['SCV', 'Marine', 'Marauder', 'Siege Tank', 'Medivac', 'Viking', 'Battlecruiser', 'Ghost', 'Thor'],
  Protoss: ['Probe', 'Zealot', 'Stalker', 'Sentry', 'Immortal', 'Colossus', 'Void Ray', 'Phoenix', 'Carrier'],
  Zerg: ['Drone', 'Zergling', 'Roach', 'Hydralisk', 'Mutalisk', 'Ultralisk', 'Infestor', 'Corruptor', 'Brood Lord'],
};

function randomUnits(race: 'Terran' | 'Protoss' | 'Zerg', count: number) {
  const pool = SC2_UNITS[race];
  const result: { name: string; count: number }[] = [];
  const used = new Set<number>();
  let remaining = count;
  while (remaining > 0 && used.size < pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    if (used.has(idx)) continue;
    used.add(idx);
    const c = Math.floor(Math.random() * Math.min(remaining, 15)) + 1;
    result.push({ name: pool[idx], count: c });
    remaining -= c;
  }
  return result;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateSampleMatch1(): RawInputData {
  const rand = seededRandom(42);
  const duration = 780;
  const rawPoints: RawInputData['rawPoints'] = [];
  const interval = 10;

  for (let t = 0; t <= duration; t += interval) {
    const progress = t / duration;
    const p1Boost = progress < 0.4 ? 1.15 : progress < 0.7 ? 0.95 : 1.05;
    const p2Boost = progress < 0.4 ? 0.9 : progress < 0.7 ? 1.1 : 0.95;

    rawPoints.push({
      timestamp: t,
      p1Apm: Math.floor(260 + rand() * 120 + Math.sin(t * 0.05) * 40) * p1Boost,
      p1Minerals: Math.floor(300 + t * 14 * p1Boost + rand() * 300 + Math.sin(t * 0.03) * 150),
      p1Gas: Math.floor(t * 5.5 * p1Boost + rand() * 120 + Math.sin(t * 0.04) * 80),
      p1Supply: Math.min(200, Math.floor(14 + t * 0.32 * p1Boost + rand() * 12)),
      p1SupplyCap: Math.min(200, 14 + Math.ceil(t * 0.04) * 14 + 14),
      p1Kills: Math.floor(t * 0.85 * p1Boost + rand() * 30),
      p1ArmyValue: Math.floor(80 + t * 32 * p1Boost + rand() * 300 + Math.sin(t * 0.035) * 200),
      p1Workers: Math.min(80, Math.floor(12 + t * 0.1 * p1Boost)),
      p2Apm: Math.floor(230 + rand() * 140 + Math.cos(t * 0.045) * 50) * p2Boost,
      p2Minerals: Math.floor(280 + t * 12.5 * p2Boost + rand() * 280 + Math.cos(t * 0.025) * 130),
      p2Gas: Math.floor(t * 5 * p2Boost + rand() * 100 + Math.cos(t * 0.035) * 70),
      p2Supply: Math.min(200, Math.floor(12 + t * 0.28 * p2Boost + rand() * 10)),
      p2SupplyCap: Math.min(200, 12 + Math.ceil(t * 0.038) * 14 + 12),
      p2Kills: Math.floor(t * 0.72 * p2Boost + rand() * 25),
      p2ArmyValue: Math.floor(60 + t * 28 * p2Boost + rand() * 260 + Math.cos(t * 0.03) * 180),
      p2Workers: Math.min(78, Math.floor(12 + t * 0.095 * p2Boost)),
    });
  }

  return {
    mapName: "赛博朋克空间站 Cyber Station",
    player1: { name: "SERRral", race: "Zerg" },
    player2: { name: "Maru", race: "Terran" },
    rawPoints,
  };
}

export function generateSampleMatch2(): RawInputData {
  const rand = seededRandom(1337);
  const duration = 540;
  const rawPoints: RawInputData['rawPoints'] = [];
  const interval = 8;

  for (let t = 0; t <= duration; t += interval) {
    const progress = t / duration;
    const p1Boost = progress < 0.5 ? 1.2 : 0.88;
    const p2Boost = progress < 0.5 ? 0.92 : 1.12;

    rawPoints.push({
      timestamp: t,
      p1Apm: Math.floor(310 + rand() * 90 + Math.sin(t * 0.06) * 35) * p1Boost,
      p1Minerals: Math.floor(320 + t * 16 * p1Boost + rand() * 250),
      p1Gas: Math.floor(t * 6.8 * p1Boost + rand() * 90),
      p1Supply: Math.min(200, Math.floor(14 + t * 0.38 * p1Boost)),
      p1SupplyCap: Math.min(200, 14 + Math.ceil(t * 0.05) * 14 + 14),
      p1Kills: Math.floor(t * 1.05 * p1Boost),
      p1ArmyValue: Math.floor(100 + t * 38 * p1Boost + rand() * 200),
      p1Workers: Math.min(75, Math.floor(14 + t * 0.09)),
      p2Apm: Math.floor(280 + rand() * 110 + Math.cos(t * 0.05) * 45) * p2Boost,
      p2Minerals: Math.floor(290 + t * 13 * p2Boost + rand() * 230),
      p2Gas: Math.floor(t * 5.8 * p2Boost + rand() * 85),
      p2Supply: Math.min(200, Math.floor(13 + t * 0.34 * p2Boost)),
      p2SupplyCap: Math.min(200, 13 + Math.ceil(t * 0.045) * 14 + 13),
      p2Kills: Math.floor(t * 0.9 * p2Boost),
      p2ArmyValue: Math.floor(90 + t * 33 * p2Boost + rand() * 180),
      p2Workers: Math.min(72, Math.floor(13 + t * 0.085)),
    });
  }

  return {
    mapName: "古代神庙 Ancient Temple",
    player1: { name: "Stats", race: "Protoss" },
    player2: { name: "Dark", race: "Zerg" },
    rawPoints,
  };
}

export function generateSampleMatch3(): RawInputData {
  const rand = seededRandom(9999);
  const duration = 960;
  const rawPoints: RawInputData['rawPoints'] = [];
  const interval = 12;

  for (let t = 0; t <= duration; t += interval) {
    const progress = t / duration;
    const p1Boost = 0.95 + Math.sin(progress * Math.PI * 3) * 0.15;
    const p2Boost = 1.05 - Math.sin(progress * Math.PI * 3) * 0.18;

    rawPoints.push({
      timestamp: t,
      p1Apm: Math.floor(240 + rand() * 100 + Math.sin(t * 0.03) * 30) * p1Boost,
      p1Minerals: Math.floor(260 + t * 13.5 * p1Boost + rand() * 400),
      p1Gas: Math.floor(t * 5.2 * p1Boost + rand() * 140),
      p1Supply: Math.min(200, Math.floor(12 + t * 0.29 * p1Boost + rand() * 15)),
      p1SupplyCap: Math.min(200, 12 + Math.ceil(t * 0.035) * 14 + 12),
      p1Kills: Math.floor(t * 0.78 * p1Boost + rand() * 50),
      p1ArmyValue: Math.floor(70 + t * 29.5 * p1Boost + rand() * 350),
      p1Workers: Math.min(85, Math.floor(11 + t * 0.088)),
      p2Apm: Math.floor(250 + rand() * 115 + Math.cos(t * 0.035) * 40) * p2Boost,
      p2Minerals: Math.floor(270 + t * 13.8 * p2Boost + rand() * 380),
      p2Gas: Math.floor(t * 5.4 * p2Boost + rand() * 130),
      p2Supply: Math.min(200, Math.floor(13 + t * 0.3 * p2Boost + rand() * 14)),
      p2SupplyCap: Math.min(200, 13 + Math.ceil(t * 0.036) * 14 + 13),
      p2Kills: Math.floor(t * 0.82 * p2Boost + rand() * 48),
      p2ArmyValue: Math.floor(75 + t * 30.2 * p2Boost + rand() * 340),
      p2Workers: Math.min(83, Math.floor(12 + t * 0.09)),
    });
  }

  return {
    mapName: "冰雪极地 Ice Frontier",
    player1: { name: "INnoVation", race: "Terran" },
    player2: { name: "Rogue", race: "Zerg" },
    rawPoints,
  };
}

export const SAMPLE_PRESET_IMAGES = [
  {
    id: 'preset-1',
    name: '赛博朋克空间站 (ZvT)',
    duration: '13:00',
    matchup: 'Zerg vs Terran',
    mapName: '赛博朋克空间站 Cyber Station',
    players: 'SERRral vs Maru',
    thumbnail: 'linear-gradient(135deg, #7c3aed33 0%, #ff6b6b33 50%, #00d4aa33 100%)',
  },
  {
    id: 'preset-2',
    name: '古代神庙 (PvZ)',
    duration: '09:00',
    matchup: 'Protoss vs Zerg',
    mapName: '古代神庙 Ancient Temple',
    players: 'Stats vs Dark',
    thumbnail: 'linear-gradient(135deg, #00d4aa33 0%, #fbbf2433 50%, #7c3aed33 100%)',
  },
  {
    id: 'preset-3',
    name: '冰雪极地 (TvZ)',
    duration: '16:00',
    matchup: 'Terran vs Zerg',
    mapName: '冰雪极地 Ice Frontier',
    players: 'INnoVation vs Rogue',
    thumbnail: 'linear-gradient(135deg, #ff6b6b33 0%, #00a3ff33 50%, #fbbf2433 100%)',
  },
];

export function getPresetMatchData(id: string): RawInputData | null {
  switch (id) {
    case 'preset-1': return generateSampleMatch1();
    case 'preset-2': return generateSampleMatch2();
    case 'preset-3': return generateSampleMatch3();
    default: return null;
  }
}

export { randomUnits };
