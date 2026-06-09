import * as THREE from 'three';
import { StarParticle } from './stars';

export const CLUSTER_RADIUS = 1.5;
export const CLUSTER_MIN_PARTICLES = 20;
export const CLUSTER_STABLE_TIME = 3.0;
export const LINE_ANIM_DURATION = 0.8;
export const BLINK_DURATION = 0.3;
export const BLINK_COUNT = 3;
export const DECONSTRUCT_TIME = 1.0;
export const MAX_LABELS = 10;

export interface SymbolTemplate {
  type: string;
  name: string;
  points: THREE.Vector3[];
  connections: [number, number][];
}

export interface CandidateCluster {
  center: THREE.Vector3;
  particleIndices: number[];
  firstSeen: number;
  matched: boolean;
}

export interface FateSymbol {
  id: number;
  type: string;
  name: string;
  center: THREE.Vector3;
  particleIndices: number[];
  lineMesh: THREE.Line | null;
  label: THREE.Object3D | null;
  createdAt: number;
  isDragging: boolean;
  flickerTimer: number;
  flickerPhase: number;
  flickerCount: number;
  primaryColor: THREE.Color;
  deconstructing: boolean;
  deconstructStart: number;
  reconstructed: boolean;
}

export function createSymbolTemplates(): SymbolTemplate[] {
  return [
    {
      type: 'constellation',
      name: '大熊座',
      points: [
        new THREE.Vector3(-1.2, 0.8, 0),
        new THREE.Vector3(-0.6, 0.6, 0),
        new THREE.Vector3(0, 0.4, 0),
        new THREE.Vector3(0.6, 0.2, 0),
        new THREE.Vector3(1.0, -0.2, 0),
        new THREE.Vector3(1.3, -0.6, 0),
        new THREE.Vector3(0.8, -0.8, 0)
      ],
      connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 6]]
    },
    {
      type: 'constellation',
      name: '猎户座',
      points: [
        new THREE.Vector3(-1.0, 1.0, 0),
        new THREE.Vector3(1.0, 1.0, 0),
        new THREE.Vector3(-0.4, 0.4, 0),
        new THREE.Vector3(0, 0.2, 0),
        new THREE.Vector3(0.4, 0.4, 0),
        new THREE.Vector3(-0.6, -0.4, 0),
        new THREE.Vector3(0.6, -0.4, 0),
        new THREE.Vector3(-0.8, -1.0, 0),
        new THREE.Vector3(0.8, -1.0, 0)
      ],
      connections: [
        [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 7], [6, 8], [5, 6]
      ]
    },
    {
      type: 'wheel',
      name: '命运之轮',
      points: (() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
        }
        pts.push(new THREE.Vector3(0, 0, 0));
        return pts;
      })(),
      connections: (() => {
        const conn: [number, number][] = [];
        for (let i = 0; i < 8; i++) {
          conn.push([i, (i + 1) % 8]);
          conn.push([i, 8]);
        }
        return conn;
      })()
    },
    {
      type: 'tree',
      name: '生命之树',
      points: [
        new THREE.Vector3(0, 1.2, 0),
        new THREE.Vector3(-0.4, 0.8, 0),
        new THREE.Vector3(0.4, 0.8, 0),
        new THREE.Vector3(-0.8, 0.4, 0),
        new THREE.Vector3(0, 0.4, 0),
        new THREE.Vector3(0.8, 0.4, 0),
        new THREE.Vector3(-0.5, 0, 0),
        new THREE.Vector3(0.5, 0, 0),
        new THREE.Vector3(0, -0.4, 0),
        new THREE.Vector3(0, -1.0, 0)
      ],
      connections: [
        [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5],
        [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8], [8, 9]
      ]
    }
  ];
}

export function detectSymbols(
  particles: StarParticle[],
  candidates: CandidateCluster[],
  existingSymbols: FateSymbol[],
  elapsedTime: number
): CandidateCluster[] {
  const usedIndices = new Set<number>();
  existingSymbols.forEach((s) => {
    s.particleIndices.forEach((idx) => usedIndices.add(idx));
  });

  const availableParticles = particles
    .map((p, idx) => ({ p, idx }))
    .filter(({ p, idx }) => !p.isLocked && !usedIndices.has(idx));

  const newCandidates: CandidateCluster[] = [];

  for (const { p: seed } of availableParticles) {
    if (newCandidates.some(
      (c) => c.particleIndices.length >= CLUSTER_MIN_PARTICLES &&
        c.center.distanceTo(seed.position) < CLUSTER_RADIUS * 2
    )) {
      continue;
    }

    const nearby: number[] = [];
    const center = new THREE.Vector3();

    for (const { p: other, idx } of availableParticles) {
      if (seed.position.distanceTo(other.position) < CLUSTER_RADIUS) {
        nearby.push(idx);
        center.add(other.position);
      }
    }

    if (nearby.length >= CLUSTER_MIN_PARTICLES) {
      center.divideScalar(nearby.length);
      const existing = candidates.find(
        (c) => c.center.distanceTo(center) < CLUSTER_RADIUS
      );
      if (existing) {
        existing.center.lerp(center, 0.1);
        existing.particleIndices = nearby;
        newCandidates.push(existing);
      } else {
        newCandidates.push({
          center: center.clone(),
          particleIndices: nearby,
          firstSeen: elapsedTime,
          matched: false
        });
      }
    }
  }

  return newCandidates;
}

function normalizePoints(points: THREE.Vector3[]): { points: THREE.Vector3[]; scale: number; center: THREE.Vector3 } {
  const center = new THREE.Vector3();
  points.forEach((p) => center.add(p));
  center.divideScalar(points.length);

  const centered = points.map((p) => p.clone().sub(center));
  let maxDist = 0;
  centered.forEach((p) => {
    maxDist = Math.max(maxDist, p.length());
  });
  const scale = maxDist > 0 ? 1 / maxDist : 1;
  centered.forEach((p) => p.multiplyScalar(scale));

  return { points: centered, scale, center };
}

export function matchShape(
  candidatePoints: THREE.Vector3[],
  templates: SymbolTemplate[]
): { template: SymbolTemplate; score: number } | null {
  if (candidatePoints.length < 5) return null;

  const { points: normCand } = normalizePoints(candidatePoints);

  let bestMatch: { template: SymbolTemplate; score: number } | null = null;

  for (const template of templates) {
    if (Math.abs(template.points.length - normCand.length) > 8) continue;

    const { points: normTmpl } = normalizePoints(template.points);

    let totalDist = 0;
    let matched = 0;

    for (const cp of normCand) {
      let minD = Infinity;
      for (const tp of normTmpl) {
        minD = Math.min(minD, cp.distanceTo(tp));
      }
      if (minD < 0.4) {
        totalDist += minD;
        matched++;
      }
    }

    const matchRatio = matched / normCand.length;
    const avgDist = matched > 0 ? totalDist / matched : 1;
    const score = matchRatio * (1 - avgDist);

    if (matchRatio > 0.5 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { template, score };
    }
  }

  return bestMatch;
}

export function renderSymbol(
  symbol: FateSymbol,
  template: SymbolTemplate,
  particles: StarParticle[],
  elapsedTime: number,
  scene: THREE.Scene
): void {
  symbol.particleIndices.forEach((idx) => {
    if (particles[idx]) {
      particles[idx].isLocked = true;
      particles[idx].symbolId = symbol.id;
      particles[idx].color.set(0xffffff);
      particles[idx].alpha = 1;
      particles[idx].pulseTimer = 0.5;
    }
  });

  const linePositions: number[] = [];
  template.connections.forEach(([a, b]) => {
    if (template.points[a] && template.points[b]) {
      const pa = template.points[a].clone().multiplyScalar(1.5).add(symbol.center);
      const pb = template.points[b].clone().multiplyScalar(1.5).add(symbol.center);
      linePositions.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    }
  });

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

  const lineMat = new THREE.LineDashedMaterial({
    color: 0xffffff,
    linewidth: 1.5,
    dashSize: 0.15,
    gapSize: 0.1,
    transparent: true,
    opacity: 0
  });

  const line = new THREE.LineSegments(lineGeo, lineMat);
  line.userData = {
    startTime: elapsedTime,
    animDuration: LINE_ANIM_DURATION,
    originalDashSize: 0.15
  };
  line.name = 'symbolLine';
  symbol.lineMesh = line;
  scene.add(line);

  playTone(440, 0.2);
}

let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function playTone(frequency: number, duration: number): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // ignore audio errors silently
  }
}

export function updateSymbolAnimations(
  symbols: FateSymbol[],
  particles: StarParticle[],
  elapsedTime: number,
  dt: number
): void {
  symbols.forEach((symbol) => {
    if (symbol.lineMesh) {
      const line = symbol.lineMesh as THREE.Line;
      const ud = line.userData as { startTime: number; animDuration: number };
      const t = Math.min(1, (elapsedTime - ud.startTime) / ud.animDuration);
      const mat = line.material as THREE.LineDashedMaterial;
      mat.opacity = Math.min(0.8, t * 1.2);
      line.computeLineDistances();
    }

    if (symbol.flickerCount > 0) {
      symbol.flickerTimer -= dt;
      if (symbol.flickerTimer <= 0) {
        symbol.flickerPhase = symbol.flickerPhase === 0 ? 1 : 0;
        symbol.flickerCount--;
        symbol.flickerTimer = BLINK_DURATION;
      }
      const flickerColor = symbol.flickerPhase === 0 ? 0xffffff : 0xffaa00;
      symbol.particleIndices.forEach((idx) => {
        if (particles[idx]) {
          particles[idx].color.setHex(flickerColor);
        }
      });
    }

    if (symbol.isDragging) {
      symbol.particleIndices.forEach((idx) => {
        const p = particles[idx];
        if (p && symbol.lineMesh) {
          p.position.copy(symbol.lineMesh.localToWorld(p.position.clone()));
        }
      });
    }
  });
}

export function startSymbolFlicker(symbol: FateSymbol): void {
  symbol.flickerCount = BLINK_COUNT * 2;
  symbol.flickerPhase = 0;
  symbol.flickerTimer = BLINK_DURATION;
}

export function deconstructSymbol(
  symbol: FateSymbol,
  particles: StarParticle[],
  elapsedTime: number
): void {
  symbol.deconstructing = true;
  symbol.deconstructStart = elapsedTime;
  symbol.particleIndices.forEach((idx) => {
    const p = particles[idx];
    if (p) {
      p.isLocked = false;
      p.symbolId = null;
      const speed = 1 + Math.random() * 2;
      const angle = Math.random() * Math.PI * 2;
      p.velocity.set(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * speed
      );
    }
  });
}

export function removeSymbol(symbol: FateSymbol, scene: THREE.Scene): void {
  if (symbol.lineMesh) {
    scene.remove(symbol.lineMesh);
    symbol.lineMesh.geometry.dispose();
    (symbol.lineMesh.material as THREE.Material).dispose();
  }
  if (symbol.label) {
    scene.remove(symbol.label);
  }
}

let symbolIdCounter = 0;
export function createFateSymbol(
  type: string,
  name: string,
  center: THREE.Vector3,
  particleIndices: number[],
  color: THREE.Color
): FateSymbol {
  return {
    id: symbolIdCounter++,
    type,
    name,
    center: center.clone(),
    particleIndices: [...particleIndices],
    lineMesh: null,
    label: null,
    createdAt: performance.now() / 1000,
    isDragging: false,
    flickerTimer: 0,
    flickerPhase: 0,
    flickerCount: 0,
    primaryColor: color.clone(),
    deconstructing: false,
    deconstructStart: 0,
    reconstructed: false
  };
}

export const FORTUNE_TEXTS: string[] = [
  "北斗指引你的前路，紫微星动，近期将有贵人出现在你的事业线上。把握每一次邂逅，命运的齿轮已开始转动。今日宜主动出击，忌犹豫不决。",
  "猎户座高悬天际，象征着勇气与力量。你内心深处的渴望即将得到回应，勇敢迈出那一步，宇宙将为你开路。相信直觉，放手一搏。",
  "命运之轮缓缓转动，过去的付出即将迎来回报。也许是一封迟来的信，也许是一次意外的重逢，保持开放的心态迎接惊喜。",
  "生命之树枝繁叶茂，你的根基正在悄然生长。看似平淡的日常中蕴藏着巨大的潜能，耐心浇灌，终将开花结果。",
  "天狼星闪耀东南，财富之光正在靠近。一笔意料之外的收入可能出现，但切记取之有道，用之有度。慷慨分享将带来更多福泽。",
  "仙后座呈W之形，警示你近期需谨慎行事。人际关系中可能出现误会，多倾听少争辩，真相自会浮现。退一步海阔天空。",
  "天蝎座群星汇聚，情感深度达到前所未有的高度。一段关系可能迎来转折点，真诚面对内心，勇气将带你穿越迷雾。",
  "狮子座光芒四射，你的才华将得到展现的舞台。抓住每一次展示自我的机会，自信是你最强大的武器。不卑不亢，方能赢得尊重。",
  "处女座井然有序，现在是整理生活的最佳时机。清理 clutter，整理思绪，为新的可能性腾出空间。秩序带来平静，平静带来智慧。",
  "天秤座寻求平衡，你正处于一个抉择的十字路口。倾听内心的声音，而非他人的期待，正确的答案早已在你心中。",
  "射手座自由奔放，远方在向你召唤。一次旅行、一次学习、一次心灵的出走，都将带来深远的改变。世界很大，去探索吧。",
  "摩羯座沉稳如山，长期的坚持即将开花结果。不要因为暂时的停滞而气馁，量变终将引发质变。耐心是你最大的美德。",
  "水瓶座创新求变，一个突破性的想法正在酝酿中。不要害怕与众不同，你的独特视角正是世界需要的。相信自己的创意。",
  "双鱼座浪漫如梦，直觉达到顶峰。此梦非彼梦，潜意识正在向你传递重要信息。记录梦境，关注符号，答案隐藏在细节之中。",
  "白羊座如日初升，新的周期已经开始。这是播种的季节，勇敢地设立新目标，宇宙将响应你的决心。行动胜于言语。",
  "金牛座稳固踏实，物质世界为你带来安全感。一个关于家或财产的决定即将成熟，相信务实的判断，不要被情绪左右。",
  "双子座灵动多变，信息流动达到高峰。沟通、学习、社交将带来意想不到的机会，保持好奇心，每一次对话都可能是命运的入口。",
  "巨蟹座温柔守护，家庭与情感是此刻的主题。给予和接受爱的能力正在增强，与所爱之人分享你的真实感受，治愈即将发生。",
  "处女座群星辉映，健康与日常习惯成为焦点。身体是灵魂的圣殿，善待它，倾听它的信号，微小的改变将带来巨大的益处。",
  "银河中心投射光芒，你的精神世界正在觉醒。冥想、阅读、独处将带来深刻洞见，答案不在外求，而在内观。",
  "金星与木星合相，爱与智慧携手降临。一段美好的关系可能开启，或现有关系进入新阶段。保持心灵开放，爱就在身边。",
  "水星逆行结束，沟通误解得以澄清。那些悬而未决的事情开始有了进展，抓住机会推动重要对话。坦诚带来解脱。",
  "满月照亮你的事业宫，成就与认可近在咫尺。回顾过去的努力，为自己感到骄傲，然后继续前行。更高的山峰在等待。",
  "新月在潜意识宫播种，这是设定意图的神圣时刻。写下你的愿望，相信宇宙的安排。种子已入土，静待发芽。",
  "火星与冥王星呈三分相，内在力量觉醒。你有能力改变任何你想要改变的状况，不要低估自己的意志力。聚焦，行动。",
  "土星回归带来考验与成长。那些你逃避的课题将再次出现，正面面对它们，这是成熟与自由的必经之路。",
  "天王星带来意外转折，期待意料之外。改变可能突如其来，但它是为了带你走向更好的方向。拥抱不确定性。",
  "海王星强化灵性感知，艺术灵感涌现。创作、音乐、诗歌都是灵魂的出口。让想象力自由飞翔，美将通过你流淌。",
  "北交点指引灵魂方向，一条新的道路正在展开。也许不是最容易的路，但它是最符合你成长的路。相信命运的指引。",
  "南交点提醒释放旧模式，某些习惯和关系已不再服务于你。带着感恩放手，为新的美好腾出空间。",
  "上升星座能量增强，你给世界的印象正在转变。人们以新的眼光看待你，利用这段时间展现真实的自我。",
  "太阳与月亮和谐相，内在与外在达到平衡。此时做的决定将兼顾理智与情感，是行动的吉时。",
  "火土相相助，热情与耐心完美结合。你有动力也有毅力去完成长期目标，稳步前进，不疾而速。",
  "金木合相于财帛宫，财运亨通。投资、加薪、馈赠皆有可能，但记得财富是能量的流动，给予也是获得。",
  "日月食激活命运轴线，一个重要的生命周期即将结束或开始。放下对未知的恐惧，蜕变虽痛，但美丽。",
  "凯龙星激活疗愈能量，旧伤有机会被治愈。勇敢面对那个痛处，它不是你的弱点，而是你力量的来源。",
  "智神星闪耀，策略思维达到巅峰。面对复杂局面，你的头脑清晰如镜，退一步观察，最佳方案自然浮现。",
  "婚神星合相金星，关于承诺的议题浮现。无论是感情还是事业合作，信任是基石。评估你的关系，投资于值得的联结。",
  "谷神星合相月亮，滋养与被滋养的课题呈现。先照顾好自己，才能真正照顾他人。界限是爱的另一种表达。",
  "福点合相太阳，好运围绕你。此时开始的项目有额外的幸运加持，大胆行动，宇宙在幕后为你铺路。",
  "命运之轮呈正位，重大转机就在眼前。过去的努力汇聚成此刻的机遇，抓住它，你的人生将驶向新的航道。",
  "星辰呈三角形格局，天赋、努力与机遇三者合一。这是属于你的黄金时刻，勇敢攀登，你将到达从未想象过的高度。",
  "流星雨划过天际，许下的愿望有特殊的加持。专注于你真正渴望的事物，心念所至，金石为开。",
  "极光般的能量场围绕着你，你的气场前所未有的强大。人们被你的光芒吸引，保持真实，你就是最好的自己。",
  "彗星造访命盘，一个改变人生的事件可能出现。它看似偶然，实则是你灵魂深处的召唤。跟随它，不要回头。",
  "超新星爆发象征旧的结束与新的开始。某个身份或篇章正在落幕，不要抵抗，让它自然消融，你将以更辉煌的形态重生。",
  "双星系统能量注入关系，一段深刻的灵魂联结正在展开。不要试图控制，让它自然流动，你将体验前所未有的亲密与成长。",
  "星门开启，时空感变得模糊。一次深刻的洞见或体验可能永久改变你的世界观。保持谦卑，你所知甚少，但你爱得很深。",
  "宇宙寂静时刻，能量暂时收束。这是内观与休整的吉时，不要强迫行动，安静下来，答案会在静默中浮现。",
  "本命盘与行运星形成完美和谐相，一切都在正确的时间正确的位置。享受这片刻的完美，感恩宇宙的安排，然后继续前行。"
];
