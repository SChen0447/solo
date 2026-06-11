import { v4 as uuidv4 } from 'uuid';
import type {
  RawInputData, TimePoint, TimelineEvent, ChartData,
  MatchSummary, MatchData, PlayerData, RadarStat, BarStat, Race,
} from '../types';
import { randomUnits } from '../mock/sampleData';

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function makePlayer(
  name: string,
  race: Race,
  side: 'p1' | 'p2',
  idx: number,
  raw: RawInputData['rawPoints'][number],
): PlayerData {
  const prefix = side === 'p1' ? 'p1' : 'p2';
  return {
    id: `${side}-${idx}`,
    name,
    race,
    apm: Math.max(50, Math.round((raw as any)[`${prefix}Apm`])),
    minerals: Math.max(0, Math.round((raw as any)[`${prefix}Minerals`])),
    gas: Math.max(0, Math.round((raw as any)[`${prefix}Gas`])),
    supply: Math.max(0, Math.round((raw as any)[`${prefix}Supply`])),
    supplyCap: Math.max(14, Math.round((raw as any)[`${prefix}SupplyCap`])),
    unitKills: Math.max(0, Math.round((raw as any)[`${prefix}Kills`])),
    buildingKills: Math.floor(Math.max(0, (raw as any)[`${prefix}Kills`] * 0.08)),
    armyValue: Math.max(0, Math.round((raw as any)[`${prefix}ArmyValue`])),
    workers: Math.max(0, Math.round((raw as any)[`${prefix}Workers`])),
  };
}

function bilinearInterpolate<T extends RawInputData['rawPoints'][number]>(points: T[], targetInterval = 1): T[] {
  if (points.length < 2) return points;
  const result: T[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const steps = Math.max(1, Math.floor((b.timestamp - a.timestamp) / targetInterval));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const ts = a.timestamp + (b.timestamp - a.timestamp) * t;
      const interpolated: any = { timestamp: Math.round(ts * 10) / 10 };
      (Object.keys(a) as (keyof T)[]).forEach((k) => {
        if (k === 'timestamp') return;
        const va = a[k] as number, vb = b[k] as number;
        interpolated[k as string] = va + (vb - va) * t;
      });
      result.push(interpolated);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

function detectEvents(timePoints: TimePoint[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (timePoints.length < 3) return events;
  const duration = timePoints[timePoints.length - 1].timestamp;

  const milestoneTimestamps = [0.05, 0.12, 0.22, 0.35, 0.5, 0.65, 0.8, 0.95];
  const eventTypes: Array<{
    type: TimelineEvent['type']; title: (n: string, e: string) => string;
    desc: (n: string, e: string) => string; color: string;
  }> = [
    { type: 'macro', title: (n, e) => `${n} 开局运营`, desc: (n, e) => `${n} 完成初期经济布局，与${e}争夺节奏优势`, color: '#00d4aa' },
    { type: 'expand', title: (n, e) => `扩张分矿`, desc: (n, e) => `${n} 率先扩张分矿，${e}需要在经济和兵力间权衡`, color: '#fbbf24' },
    { type: 'tech', title: (n, e) => `科技升级`, desc: (n, e) => `${n} 关键科技升级完成，战术选项增加`, color: '#7c3aed' },
    { type: 'upgrade', title: (n, e) => `攻防升级`, desc: (n, e) => `${n} 完成一级攻防升级，部队质量提升`, color: '#00a3ff' },
    { type: 'combat', title: (n, e) => `首次大规模交火`, desc: (n, e) => `${n} 与 ${e} 在地图中央爆发激烈会战`, color: '#ff6b6b' },
    { type: 'attack', title: (n, e) => `主动进攻`, desc: (n, e) => `${n} 集结主力部队向 ${e} 发起压制性进攻`, color: '#ff4757' },
    { type: 'expand', title: (n, e) => `后期扩张`, desc: (n, e) => `${n} 扩张至第四片矿区，经济领先${e}`, color: '#fbbf24' },
    { type: 'combat', title: (n, e) => `最终决战`, desc: (n, e) => `${n} 与 ${e} 爆发决定胜负的终极会战`, color: '#ff3838' },
  ];

  milestoneTimestamps.forEach((p, i) => {
    const tIdx = Math.min(timePoints.length - 1, Math.floor(timePoints.length * p));
    const tp = timePoints[tIdx];
    if (!tp) return;
    const template = eventTypes[i] || eventTypes[eventTypes.length - 1];
    const p1Adv = (tp.player1.armyValue + tp.player1.minerals + tp.player1.gas * 1.5) -
                  (tp.player2.armyValue + tp.player2.minerals + tp.player2.gas * 1.5);
    const advantage = p1Adv >= 0 ? tp.player1.name : tp.player2.name;
    const opponent = p1Adv >= 0 ? tp.player2.name : tp.player1.name;

    events.push({
      uuid: uuidv4(),
      timestamp: tp.timestamp,
      type: template.type,
      title: template.title(advantage, opponent),
      description: template.desc(advantage, opponent),
      color: template.color,
      details: {
        resourceDiff: {
          minerals: tp.player1.minerals - tp.player2.minerals,
          gas: tp.player1.gas - tp.player2.gas,
        },
        armyDiff: tp.player1.armyValue - tp.player2.armyValue,
        apmDiff: tp.player1.apm - tp.player2.apm,
        supplyDiff: tp.player1.supply - tp.player2.supply,
        p1Units: randomUnits(tp.player1.race, Math.floor(tp.player1.supply * 0.6)),
        p2Units: randomUnits(tp.player2.race, Math.floor(tp.player2.supply * 0.6)),
      },
    });
  });

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

function buildChartSeries(timePoints: TimePoint[]): ChartData[] {
  return timePoints.map((tp) => ({
    timestamp: tp.timestamp,
    timeLabel: formatTime(tp.timestamp),
    p1Minerals: tp.player1.minerals,
    p2Minerals: tp.player2.minerals,
    p1Gas: tp.player1.gas,
    p2Gas: tp.player2.gas,
    p1ArmyValue: tp.player1.armyValue,
    p2ArmyValue: tp.player2.armyValue,
    p1Apm: tp.player1.apm,
    p2Apm: tp.player2.apm,
  }));
}

function buildSummary(timePoints: TimePoint[]): MatchSummary {
  if (timePoints.length === 0) {
    return {
      duration: 0, totalKillsP1: 0, totalKillsP2: 0, maxApmP1: 0, maxApmP2: 0,
      avgApmP1: 0, avgApmP2: 0, totalResourcesP1: 0, totalResourcesP2: 0,
      peakArmyP1: 0, peakArmyP2: 0, expoCountP1: 0, expoCountP2: 0, winner: 'draw',
    };
  }
  let maxApmP1 = 0, maxApmP2 = 0, sumApmP1 = 0, sumApmP2 = 0;
  let totalResP1 = 0, totalResP2 = 0, peakArmyP1 = 0, peakArmyP2 = 0;

  timePoints.forEach((tp) => {
    maxApmP1 = Math.max(maxApmP1, tp.player1.apm);
    maxApmP2 = Math.max(maxApmP2, tp.player2.apm);
    sumApmP1 += tp.player1.apm;
    sumApmP2 += tp.player2.apm;
    totalResP1 += tp.player1.minerals + tp.player1.gas * 1.25;
    totalResP2 += tp.player2.minerals + tp.player2.gas * 1.25;
    peakArmyP1 = Math.max(peakArmyP1, tp.player1.armyValue);
    peakArmyP2 = Math.max(peakArmyP2, tp.player2.armyValue);
  });

  const last = timePoints[timePoints.length - 1];
  const scoreP1 = last.player1.unitKills * 50 + last.player1.armyValue + last.player1.minerals * 0.3;
  const scoreP2 = last.player2.unitKills * 50 + last.player2.armyValue + last.player2.minerals * 0.3;

  return {
    duration: last.timestamp,
    totalKillsP1: last.player1.unitKills,
    totalKillsP2: last.player2.unitKills,
    maxApmP1: Math.round(maxApmP1),
    maxApmP2: Math.round(maxApmP2),
    avgApmP1: Math.round(sumApmP1 / timePoints.length),
    avgApmP2: Math.round(sumApmP2 / timePoints.length),
    totalResourcesP1: Math.round(totalResP1),
    totalResourcesP2: Math.round(totalResP2),
    peakArmyP1,
    peakArmyP2,
    expoCountP1: Math.max(1, Math.floor(last.player1.workers / 18)),
    expoCountP2: Math.max(1, Math.floor(last.player2.workers / 18)),
    winner: scoreP1 > scoreP2 ? 'player1' : scoreP2 > scoreP1 ? 'player2' : 'draw',
  };
}

export function processRawData(raw: RawInputData): MatchData {
  const sortedRaw = [...raw.rawPoints].sort((a, b) => a.timestamp - b.timestamp);
  const interpolatedRaw = bilinearInterpolate(sortedRaw, 2);

  const timePoints: TimePoint[] = interpolatedRaw.map((r, i) => ({
    timestamp: r.timestamp,
    player1: makePlayer(raw.player1.name, raw.player1.race, 'p1', i, r),
    player2: makePlayer(raw.player2.name, raw.player2.race, 'p2', i, r),
  }));

  const events = detectEvents(timePoints);
  const chartSeries = buildChartSeries(timePoints);
  const summary = buildSummary(timePoints);

  return {
    id: uuidv4(),
    mapName: raw.mapName,
    duration: summary.duration,
    player1: { name: raw.player1.name, race: raw.player1.race },
    player2: { name: raw.player2.name, race: raw.player2.race },
    timePoints,
    events,
    chartSeries,
    summary,
    createdAt: Date.now(),
  };
}

export function findTimePointIndex(timePoints: TimePoint[], timestamp: number): number {
  if (timePoints.length === 0) return 0;
  if (timestamp <= timePoints[0].timestamp) return 0;
  if (timestamp >= timePoints[timePoints.length - 1].timestamp) return timePoints.length - 1;
  let lo = 0, hi = timePoints.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (timePoints[mid].timestamp <= timestamp) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function buildRadarStats(summary: MatchSummary, side: 'p1' | 'p2', label: string): { name: string; stats: RadarStat[] } {
  const norm = (v: number, ref: number, cap = 100) => Math.min(cap, Math.round((v / Math.max(ref, 1)) * cap));
  const maxKills = Math.max(summary.totalKillsP1, summary.totalKillsP2, 1);
  const maxApm = Math.max(summary.avgApmP1, summary.avgApmP2, 1);
  const maxRes = Math.max(summary.totalResourcesP1, summary.totalResourcesP2, 1);
  const maxArmy = Math.max(summary.peakArmyP1, summary.peakArmyP2, 1);
  const maxExpo = Math.max(summary.expoCountP1, summary.expoCountP2, 1);

  const kills = side === 'p1' ? summary.totalKillsP1 : summary.totalKillsP2;
  const apm = side === 'p1' ? summary.avgApmP1 : summary.avgApmP2;
  const maxApmV = side === 'p1' ? summary.maxApmP1 : summary.maxApmP2;
  const res = side === 'p1' ? summary.totalResourcesP1 : summary.totalResourcesP2;
  const army = side === 'p1' ? summary.peakArmyP1 : summary.peakArmyP2;
  const expo = side === 'p1' ? summary.expoCountP1 : summary.expoCountP2;

  const fm = 100;
  return {
    name: label,
    stats: [
      { subject: '击杀能力', value: norm(kills, maxKills), fullMark: fm },
      { subject: '操作强度', value: norm(apm, maxApm), fullMark: fm },
      { subject: '峰值操作', value: norm(maxApmV, Math.max(summary.maxApmP1, summary.maxApmP2)), fullMark: fm },
      { subject: '经济运营', value: norm(res, maxRes), fullMark: fm },
      { subject: '兵力峰值', value: norm(army, maxArmy), fullMark: fm },
      { subject: '扩张能力', value: norm(expo, maxExpo), fullMark: fm },
    ],
  };
}

export function buildBarStats(s1: MatchSummary, m1Label: string, s2: MatchSummary, m2Label: string): { data: BarStat[]; keys: string[] } {
  return {
    keys: [m1Label, m2Label],
    data: [
      { name: '比赛时长(分)', match1: Math.round(s1.duration / 60), match2: Math.round(s2.duration / 60) },
      { name: '总击杀数', match1: s1.totalKillsP1 + s1.totalKillsP2, match2: s2.totalKillsP1 + s2.totalKillsP2 },
      { name: '最高APM', match1: Math.max(s1.maxApmP1, s1.maxApmP2), match2: Math.max(s2.maxApmP1, s2.maxApmP2) },
      { name: '平均APM', match1: Math.round((s1.avgApmP1 + s1.avgApmP2) / 2), match2: Math.round((s2.avgApmP1 + s2.avgApmP2) / 2) },
      { name: '总资源量(k)', match1: Math.round(s1.totalResourcesP1 / 1000), match2: Math.round(s2.totalResourcesP2 / 1000) },
      { name: '兵力峰值', match1: Math.max(s1.peakArmyP1, s1.peakArmyP2), match2: Math.max(s2.peakArmyP1, s2.peakArmyP2) },
    ],
  };
}
