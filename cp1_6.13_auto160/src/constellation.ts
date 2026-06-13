import gsap from 'gsap';

export interface ConstellationStar {
  x: number;
  y: number;
  radius: number;
  explored: boolean;
}

export interface ConstellationData {
  id: number;
  name: string;
  ancientText: string;
  brightStars: number;
  stars: ConstellationStar[];
  connections: [number, number][];
  story: string;
  explored: boolean;
  discoveredAt: number | null;
}

export interface Star {
  x: number;
  y: number;
  radius: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
}

export interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  trailLength: number;
  alive: boolean;
  constellationId: number;
  starIndex: number;
}

export const CONSTELLATIONS: ConstellationData[] = [
  {
    id: 0,
    name: '角宿一',
    ancientText: '角',
    brightStars: 9,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]],
    story: '角宿乃东方苍龙七宿之首，主春生万物。传说角宿之星为苍龙双角，掌天地之气机，司万物之萌发。古时春分之日，帝王亲祀角宿，祈愿五谷丰登，国泰民安。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 1,
    name: '亢宿',
    ancientText: '亢',
    brightStars: 8,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,0],[1,4],[4,5],[5,6],[6,7]],
    story: '亢宿为苍龙七宿之第二，如龙颈咽喉，主法度礼仪。亢宿四星排列如庙，古称"天府"。传亢宿主疏讼，察善恶，明是非，为天庭之御史台，纠察三界之不正。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 2,
    name: '氐宿',
    ancientText: '氐',
    brightStars: 11,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[2,6],[6,7],[7,8],[8,9],[9,10]],
    story: '氐宿为苍龙七宿之第三，如龙之前爪，主根基根本。氐宿又称"天根"，为天子之正寝。古时立国建都，必观氐宿方位，以定社稷之基，求万世之永固。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 3,
    name: '房宿',
    ancientText: '房',
    brightStars: 10,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,5],[5,6],[6,7],[7,8],[8,9]],
    story: '房宿为苍龙七宿之第四，如龙之胸腹，主明堂政务。房宿四星为天子四辅，左骖右骖。古者天子布政于明堂，顺四时，施八政，皆观房宿以定吉凶休咎。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 4,
    name: '心宿',
    ancientText: '心',
    brightStars: 9,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[0,4]],
    story: '心宿为苍龙七宿之第五，又名"大火"，主帝王之心。心宿三星，中为明堂，左右为太子庶子。昔帝尧命阏伯居商丘，祀大火，此星之明晦，关乎王朝之兴衰更替。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 5,
    name: '尾宿',
    ancientText: '尾',
    brightStars: 12,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11]],
    story: '尾宿为苍龙七宿之第六，如龙之尾梢，主后宫子嗣。尾宿九星曲折如钩，为九子之象。古人观尾宿之明暗，卜后宫之吉凶，子孙之昌衰。尾动则有喜，星暗则有忧。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 6,
    name: '箕宿',
    ancientText: '箕',
    brightStars: 8,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,0],[0,4],[4,5],[5,6],[6,7]],
    story: '箕宿为苍龙七宿之末，主口舌风议。箕宿四星形如簸箕，故主五谷之簸扬，亦主谗言诽谤。昔者箕子过殷墟，见麦秀渐渐，乃作麦秀之诗，为千古亡国之叹也。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 7,
    name: '斗宿',
    ancientText: '斗',
    brightStars: 9,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[3,7],[7,8]],
    story: '斗宿为北方玄武七宿之首，又称"南斗"，主天子寿禄。南斗六星，主天子之寿命，亦主宰相之爵禄。古有"南斗注生，北斗注死"之说，凡人受胎，皆从南斗过北斗。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 8,
    name: '牛宿',
    ancientText: '牛',
    brightStars: 10,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[0,5]],
    story: '牛宿为玄武七宿之第二，主牺牲耕种。牛宿六星如牛之两角，故称牵牛。昔牛郎织女，七夕相会，鹊桥横跨银河，传为千古佳话。此日人间乞巧，观双星渡河。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 9,
    name: '女宿',
    ancientText: '女',
    brightStars: 8,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,0],[0,4],[4,5],[5,6],[6,7],[7,1]],
    story: '女宿为玄武七宿之第三，又称"须女"，主女工布帛。女宿四星相连如织梭，为天之少女。织女巧手，云锦天章，人间女子设瓜果祭之，以求聪慧灵巧，巧夺天工。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 10,
    name: '虚宿',
    ancientText: '虚',
    brightStars: 10,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,5],[5,6],[6,7],[7,8],[8,9],[9,2]],
    story: '虚宿为玄武七宿之第四，主冢宰祭祀。虚宿二星上下相对，为天子之庙堂，主丧葬哭泣之事。古人观虚宿以定郊祀之礼，敬天法祖，慎终追远，不忘其所由来也。',
    explored: false,
    discoveredAt: null
  },
  {
    id: 11,
    name: '危宿',
    ancientText: '危',
    brightStars: 9,
    stars: [],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[0,3]],
    story: '危宿为玄武七宿之第五，主宗庙房屋。危宿三星上锐而下大，如屋宇之盖。古者将作大匠，必观危宿以定营造之方，求栋宇之坚固，风雨之不侵，子孙之安居也。',
    explored: false,
    discoveredAt: null
  }
];

export function generateConstellationStars(index: number, centerX: number, centerY: number, spreadRadius: number): ConstellationStar[] {
  const count = CONSTELLATIONS[index].brightStars;
  const stars: ConstellationStar[] = [];
  const angleStep = (Math.PI * 2) / count;
  const baseAngle = (index / 12) * Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const angle = baseAngle + angleStep * i + (Math.random() - 0.5) * 0.5;
    const radius = spreadRadius * (0.3 + Math.random() * 0.7);
    stars.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      radius: 2,
      explored: false
    });
  }

  return stars;
}

export function generateBackgroundStars(count: number, width: number, height: number, margin: number = 0): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: margin + Math.random() * (width - margin * 2),
      y: margin + Math.random() * (height - margin * 2),
      radius: 1 + Math.random() * 1,
      brightness: 0.3 + Math.random() * 0.7,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 1.5
    });
  }
  return stars;
}

export interface AnimationState {
  constellationStates: Map<number, {
    appearProgress: number;
    appearStartTime: number;
    lineProgress: number;
    lineStartTime: number;
    opacity: number;
    dimmed: boolean;
  }>;
  ripples: RippleEffect[];
  meteors: Meteor[];
  activeConstellationId: number | null;
  hoverStartTime: number;
  hoveredConstellationId: number | null;
}

export function createAnimationState(): AnimationState {
  return {
    constellationStates: new Map(),
    ripples: [],
    meteors: [],
    activeConstellationId: null,
    hoverStartTime: 0,
    hoveredConstellationId: null
  };
}

export function triggerConstellationAppear(state: AnimationState, constellationId: number, timeline: gsap.core.Timeline): void {
  const startTime = performance.now();
  state.constellationStates.set(constellationId, {
    appearProgress: 0,
    appearStartTime: startTime,
    lineProgress: 0,
    lineStartTime: startTime + 1000,
    opacity: 1,
    dimmed: false
  });

  const animState = state.constellationStates.get(constellationId)!;
  timeline.to(animState, {
    appearProgress: 1,
    duration: 1,
    ease: 'power2.out'
  });
  timeline.to(animState, {
    lineProgress: 1,
    duration: 0.8,
    ease: 'power2.out'
  }, '>0.2');
}

export function triggerRipple(state: AnimationState, x: number, y: number): void {
  state.ripples.push({
    x,
    y,
    radius: 0,
    maxRadius: 50,
    alpha: 1,
    startTime: performance.now()
  });
}

export function triggerMeteor(
  state: AnimationState,
  x: number,
  y: number,
  constellationId: number,
  starIndex: number,
  canvasW: number,
  canvasH: number
): Meteor {
  const angle = Math.random() * Math.PI * 2;
  const speed = 50 + Math.random() * 30;
  const meteor: Meteor = {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    trail: [],
    trailLength: 30,
    alive: true,
    constellationId,
    starIndex
  };
  state.meteors.push(meteor);
  return meteor;
}

export function updateAnimations(
  state: AnimationState,
  dt: number,
  canvasW: number,
  canvasH: number
): void {
  const now = performance.now();

  state.ripples = state.ripples.filter(ripple => {
    const elapsed = (now - ripple.startTime) / 600;
    if (elapsed >= 1) return false;
    ripple.radius = ripple.maxRadius * elapsed;
    ripple.alpha = 1 - elapsed;
    return true;
  });

  state.meteors = state.meteors.filter(meteor => {
    if (!meteor.alive) return false;

    meteor.trail.push({ x: meteor.x, y: meteor.y });
    if (meteor.trail.length > meteor.trailLength) {
      meteor.trail.shift();
    }

    meteor.x += meteor.vx * dt;
    meteor.y += meteor.vy * dt;

    if (meteor.x < -50 || meteor.x > canvasW + 50 ||
        meteor.y < -50 || meteor.y > canvasH + 50) {
      meteor.alive = false;
      return false;
    }
    return true;
  });
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
