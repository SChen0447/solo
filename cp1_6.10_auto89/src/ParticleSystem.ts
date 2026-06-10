import * as THREE from 'three';

export type EventType = 'war' | 'culture' | 'science' | 'disaster';

export interface HistoricalEvent {
  id: number;
  name: string;
  year: number;
  type: EventType;
  description: string;
  targetPosition: THREE.Vector3;
  pathType: 'sphere' | 'spiral1' | 'spiral2';
}

const EVENT_COLORS: Record<EventType, string> = {
  war: '#e74c3c',
  culture: '#3498db',
  science: '#2ecc71',
  disaster: '#f39c12'
};

const EVENT_ICONS: Record<EventType, string> = {
  war: '⚔',
  culture: '✦',
  science: '⚛',
  disaster: '⚠'
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  war: '战争',
  culture: '文化',
  science: '科技',
  disaster: '灾难'
};

const GENERIC_NAMES: Record<EventType, string[]> = {
  war: [
    '伯罗奔尼撒战争', '秦统一六国', '楚汉之争', '罗马扩张', '黄巾起义',
    '赤壁之战', '淝水之战', '安史之乱', '十字军东征', '蒙古西征',
    '百年战争', '红白玫瑰战争', '奥斯曼扩张', '壬辰倭乱', '三十年战争',
    '英国内战', '大同盟战争', '西班牙王位继承战', '七年战争', '美国独立战争',
    '法国大革命战争', '拿破仑战争', '鸦片战争', '美国内战', '普法战争',
    '甲午战争', '八国联军侵华', '第一次世界大战', '第二次世界大战', '朝鲜战争',
    '越南战争', '海湾战争', '阿富汗战争', '伊拉克战争'
  ],
  culture: [
    '孔子讲学', '苏格拉底之死', '柏拉图创办学园', '百家争鸣', '秦始皇焚书坑儒',
    '司马迁著史记', '佛教传入中国', '蔡伦改进造纸术', '君士坦丁大帝颁布米兰敕令',
    '王羲之书兰亭序', '顾恺之作女史箴图', '祖冲之计算圆周率', '科举制度创立',
    '玄奘西行取经', '李白诗歌创作', '杜甫诗歌创作', '韩愈发起古文运动',
    '活字印刷术发明', '宋词兴盛', '元曲繁荣', '达芬奇创作蒙娜丽莎',
    '米开朗基罗创世纪', '拉斐尔雅典学院', '哥白尼天体运行论', '莎士比亚戏剧创作',
    '汤显祖牡丹亭', '曹雪芹著红楼梦', '歌德浮士德', '贝多芬交响曲',
    '巴尔扎克人间喜剧', '托尔斯泰战争与和平', '印象派兴起', '毕加索立体主义'
  ],
  science: [
    '欧几里得几何原本', '阿基米德浮力定律', '张衡发明地动仪', '华佗发明麻沸散',
    '祖冲之大明历', '一行测量子午线', '沈括著梦溪笔谈', '郭守敬授时历',
    '哥伦布发现新大陆', '达伽马开辟新航路', '麦哲伦环球航行', '伽利略天文望远镜',
    '开普勒行星定律', '牛顿三大定律', '哈维血液循环理论', '莱布尼茨微积分',
    '瓦特改良蒸汽机', '达尔文进化论', '孟德尔遗传定律', '诺贝尔发明炸药',
    '门捷列夫元素周期表', '爱迪生电灯发明', '贝尔发明电话', '伦琴发现X射线',
    '居里夫人发现镭', '普朗克量子论', '爱因斯坦相对论', '莱特兄弟发明飞机',
    '青霉素发现', '电子计算机诞生', 'DNA双螺旋结构', '阿波罗登月',
    '互联网诞生', '基因组计划', '人工智能兴起'
  ],
  disaster: [
    '维苏威火山爆发', '建安大瘟疫', '查士丁尼大瘟疫', '黑死病爆发',
    '华县大地震', '伦敦大瘟疫', '通古斯大爆炸', '关东大地震',
    '1918年流感大流行', '黄河大洪水', '孟加拉飓风', '唐山大地震',
    '印度洋海啸', '卡特里娜飓风', '汶川大地震', '新冠疫情爆发',
    '桑给巴尔海啸', '东京大空袭', '兴登堡号空难', '泰坦尼克号沉没',
    '智利大地震', '墨西哥城大地震', '日本311大地震', '青海玉树地震',
    '埃博拉疫情', '非典疫情', '欧洲热浪', '美国大沙尘暴'
  ]
};

const GENERIC_DESCRIPTIONS: Record<EventType, string[]> = {
  war: [
    '改变了当时的政治格局，对后世产生了深远影响。',
    '是历史上重要的军事冲突，造成了大量人员伤亡。',
    '具有划时代的意义，标志着一个新时代的开始。',
    '这场战争持续多年，深刻改变了地区力量平衡。',
    '一次具有决定性意义的战役，成为历史转折点。'
  ],
  culture: [
    '是人类文明史上的重要里程碑，影响深远。',
    '代表了当时最高的艺术成就，至今仍被传颂。',
    '这一文化事件推动了思想解放与社会进步。',
    '开启了新的文化思潮，影响了后世数百年。',
    '是东西方文化交流的重要见证。'
  ],
  science: [
    '这一发现彻底改变了人类对世界的认知。',
    '是科技发展史上的突破性成就。',
    '为后续的科学研究奠定了重要基础。',
    '这项发明极大地提高了生产力，改变了人类生活。',
    '开辟了全新的科学研究领域。'
  ],
  disaster: [
    '造成了巨大的人员伤亡和财产损失。',
    '是人类历史上最严重的自然灾害之一。',
    '这一灾难改变了当地的生态和社会结构。',
    '给人类留下了深刻的教训，推动了防灾体系的建设。',
    '灾难过后，人类展现了顽强的重建精神。'
  ]
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function cubicBezier(
  t: number,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3
): THREE.Vector3 {
  const u = 1 - t;
  const result = new THREE.Vector3();
  result.x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
  result.y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
  result.z = u * u * u * p0.z + 3 * u * u * t * p1.z + 3 * u * t * t * p2.z + t * t * t * p3.z;
  return result;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private events: HistoricalEvent[] = [];
  private particles!: THREE.Points;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private opacities!: Float32Array;
  private starField!: THREE.Points;
  private nebula!: THREE.Mesh;
  private highlightParticles: THREE.Points[] = [];
  private highlightOrbitAngle = 0;
  private highlightedEventId: number | null = null;
  private currentYear: number = -500;
  private targetYear: number = -500;
  private animationStartYear: number = -500;
  private isSmoothAnimating = false;
  private smoothAnimationProgress = 0;
  private smoothAnimationStartYear = -500;
  private smoothAnimationTargetYear = -500;
  private rateFactor: number = 2.0;
  private starOpacityAttributes!: Float32Array;
  private starBaseBrightness!: number[];
  private starFlickerOffset!: number[];
  private starFlickerSpeed!: number[];
  public particleCount: number;
  public cameraDistanceThreshold: number = 40;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleCount = 1000;
    this.generateEvents();
    this.createParticles();
    this.createStarField();
    this.createNebula();
  }

  private generateEvents(): void {
    const rand = seededRandom(42);
    const types: EventType[] = ['war', 'culture', 'science', 'disaster'];

    for (let i = 0; i < this.particleCount; i++) {
      const year = Math.floor(rand() * 2500) - 500;
      const type = types[Math.floor(rand() * types.length)];
      const nameList = GENERIC_NAMES[type];
      const descList = GENERIC_DESCRIPTIONS[type];
      const name = nameList[Math.floor(rand() * nameList.length)];
      const description = descList[Math.floor(rand() * descList.length)];

      const pathRoll = rand();
      let pathType: 'sphere' | 'spiral1' | 'spiral2';
      if (pathRoll < 0.5) pathType = 'sphere';
      else if (pathRoll < 0.75) pathType = 'spiral1';
      else pathType = 'spiral2';

      let targetPosition: THREE.Vector3;
      const timeProgress = (year + 500) / 2500;

      if (pathType === 'sphere') {
        const phi = Math.acos(2 * rand() - 1);
        const theta = 2 * Math.PI * rand();
        const r = 10;
        targetPosition = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      } else if (pathType === 'spiral1') {
        const radius = 4 + timeProgress * 8;
        const angle = timeProgress * Math.PI * 6;
        const height = (timeProgress - 0.5) * 16;
        targetPosition = new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );
      } else {
        const radius = 4 + timeProgress * 8;
        const angle = -timeProgress * Math.PI * 6;
        const height = (0.5 - timeProgress) * 16;
        targetPosition = new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );
      }

      this.events.push({
        id: i,
        name,
        year,
        type,
        description,
        targetPosition,
        pathType
      });
    }

    this.events.sort((a, b) => a.year - b.year);
    this.events.forEach((ev, idx) => {
      ev.id = idx;
    });
  }

  private createParticles(): void {
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.opacities = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.4 + 0.05;
      this.positions[i * 3] = Math.cos(angle) * r;
      this.positions[i * 3 + 1] = Math.sin(angle) * r * 0.5;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      const color = new THREE.Color(EVENT_COLORS[this.events[i].type]);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = 0.1;
      this.opacities[i] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createStarField(): void {
    const starCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    this.starOpacityAttributes = new Float32Array(starCount);
    this.starBaseBrightness = [];
    this.starFlickerOffset = [];
    this.starFlickerSpeed = [];

    for (let i = 0; i < starCount; i++) {
      const r = 50 + Math.random() * 30;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.2 + Math.random() * 0.8;
      this.starBaseBrightness.push(brightness);
      this.starFlickerOffset.push(Math.random() * Math.PI * 2);
      this.starFlickerSpeed.push((4 + Math.random() * 4));
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * 0.95;
      sizes[i] = 1 + Math.random() * 2;
      this.starOpacityAttributes[i] = brightness;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private createNebula(): void {
    const geometry = new THREE.SphereGeometry(45, 32, 32);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(44, 62, 80, 0)');
    gradient.addColorStop(0.5, 'rgba(142, 68, 173, 0.06)');
    gradient.addColorStop(1, 'rgba(44, 62, 80, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 12000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 1.5 + 0.3;
      const t = Math.random();
      const cr = Math.floor(44 + t * 98);
      const cg = Math.floor(62 + t * 6);
      const cb = Math.floor(80 + t * 93);
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${Math.random() * 0.04})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    this.nebula = new THREE.Mesh(geometry, material);
    this.scene.add(this.nebula);
  }

  public setRateFactor(factor: number): void {
    this.rateFactor = Math.max(1.0, Math.min(3.0, factor));
  }

  public setCurrentYear(year: number, smooth: boolean = false): void {
    const clampedYear = Math.max(-500, Math.min(2000, year));

    if (smooth) {
      this.isSmoothAnimating = true;
      this.smoothAnimationProgress = 0;
      this.smoothAnimationStartYear = this.currentYear;
      this.smoothAnimationTargetYear = clampedYear;
    } else {
      this.currentYear = clampedYear;
      this.isSmoothAnimating = false;
    }
    this.targetYear = clampedYear;
  }

  public getCurrentYear(): number {
    return this.currentYear;
  }

  public getEvents(): HistoricalEvent[] {
    return this.events;
  }

  public getEventById(id: number): HistoricalEvent | null {
    return this.events[id] || null;
  }

  public static getEventColor(type: EventType): string {
    return EVENT_COLORS[type];
  }

  public static getEventIcon(type: EventType): string {
    return EVENT_ICONS[type];
  }

  public static getEventTypeLabel(type: EventType): string {
    return EVENT_TYPE_LABELS[type];
  }

  public highlightEvent(eventId: number): void {
    this.clearHighlight();
    this.highlightedEventId = eventId;

    const event = this.events[eventId];
    if (!event) return;

    const orbitCount = 8;
    for (let i = 0; i < orbitCount; i++) {
      const geometry = new THREE.BufferGeometry();
      const pos = new Float32Array(3);
      geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));

      const material = new THREE.PointsMaterial({
        size: 0.25,
        color: 0xffd700,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const particle = new THREE.Points(geometry, material);
      particle.userData.orbitIndex = i;
      this.scene.add(particle);
      this.highlightParticles.push(particle);
    }
  }

  public clearHighlight(): void {
    this.highlightedEventId = null;
    for (const p of this.highlightParticles) {
      this.scene.remove(p);
      (p.geometry as THREE.BufferGeometry).dispose();
      (p.material as THREE.Material).dispose();
    }
    this.highlightParticles = [];
  }

  public getHighlightedEventId(): number | null {
    return this.highlightedEventId;
  }

  public getPoints(): THREE.Points {
    return this.particles;
  }

  public getParticlePosition(eventId: number): THREE.Vector3 | null {
    if (eventId < 0 || eventId >= this.particleCount) return null;
    return new THREE.Vector3(
      this.positions[eventId * 3],
      this.positions[eventId * 3 + 1],
      this.positions[eventId * 3 + 2]
    );
  }

  public update(deltaTime: number, camera: THREE.Camera): void {
    if (this.isSmoothAnimating) {
      this.smoothAnimationProgress += deltaTime / 1.5;
      if (this.smoothAnimationProgress >= 1) {
        this.smoothAnimationProgress = 1;
        this.isSmoothAnimating = false;
        this.currentYear = this.smoothAnimationTargetYear;
      } else {
        const t = easeOutCubic(this.smoothAnimationProgress);
        this.currentYear = this.smoothAnimationStartYear +
          (this.smoothAnimationTargetYear - this.smoothAnimationStartYear) * t;
      }
    }

    const cameraPos = camera.position;
    this.highlightOrbitAngle += deltaTime * (Math.PI);

    for (let i = 0; i < this.particleCount; i++) {
      const event = this.events[i];
      const idx = i * 3;

      const dx = this.positions[idx] - cameraPos.x;
      const dy = this.positions[idx + 1] - cameraPos.y;
      const dz = this.positions[idx + 2] - cameraPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const isFar = distSq > this.cameraDistanceThreshold * this.cameraDistanceThreshold;

      let activationProgress = 0;
      if (this.currentYear >= event.year) {
        const yearDiff = this.currentYear - event.year;
        activationProgress = Math.min(1, yearDiff / (50 / this.rateFactor));
        activationProgress = easeOutCubic(activationProgress);
      }

      const origin = new THREE.Vector3(0, 0, 0);
      const dir = event.targetPosition.clone().normalize();
      const cp1 = dir.clone().multiplyScalar(3);
      const cp2 = event.targetPosition.clone().sub(dir.clone().multiplyScalar(3));
      const currentPos = cubicBezier(activationProgress, origin, cp1, cp2, event.targetPosition);

      if (!isFar) {
        this.positions[idx] = currentPos.x;
        this.positions[idx + 1] = currentPos.y;
        this.positions[idx + 2] = currentPos.z;
      }

      let size = 0.1 + activationProgress * 0.5;
      let opacity = 1.0 - activationProgress * 0.7;
      let colorR = this.colors[idx];
      let colorG = this.colors[idx + 1];
      let colorB = this.colors[idx + 2];

      if (this.highlightedEventId === i) {
        size *= 1.5;
        opacity = 1.0;
        colorR = 1.0;
        colorG = 215 / 255;
        colorB = 0;
      }

      this.sizes[i] = size;
      this.opacities[i] = opacity;

      if (!isFar) {
        this.colors[idx] = colorR;
        this.colors[idx + 1] = colorG;
        this.colors[idx + 2] = colorB;
      }
    }

    const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    const colorAttr = this.particles.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;

    for (let i = 0; i < this.highlightParticles.length; i++) {
      const particle = this.highlightParticles[i];
      if (this.highlightedEventId !== null) {
        const event = this.events[this.highlightedEventId];
        const basePos = cubicBezier(
          easeOutCubic(Math.min(1, Math.max(0, (this.currentYear - event.year) / (50 / this.rateFactor)))),
          new THREE.Vector3(),
          event.targetPosition.clone().normalize().multiplyScalar(3),
          event.targetPosition.clone().sub(event.targetPosition.clone().normalize().multiplyScalar(3)),
          event.targetPosition
        );

        const angle = this.highlightOrbitAngle + (i / this.highlightParticles.length) * Math.PI * 2;
        const radius = 0.8;
        const ox = Math.cos(angle) * radius;
        const oy = Math.sin(angle * 0.7) * 0.3;
        const oz = Math.sin(angle) * radius;

        const pos = particle.geometry.getAttribute('position') as THREE.BufferAttribute;
        pos.array[0] = basePos.x + ox;
        pos.array[1] = basePos.y + oy;
        pos.array[2] = basePos.z + oz;
        pos.needsUpdate = true;
        particle.visible = true;
      } else {
        particle.visible = false;
      }
    }

    const starColorAttr = this.starField.geometry.getAttribute('color') as THREE.BufferAttribute;
    const time = performance.now() / 1000;
    for (let i = 0; i < 1000; i++) {
      const flicker = 0.5 + 0.5 * Math.sin(time * this.starFlickerSpeed[i] + this.starFlickerOffset[i]);
      const brightness = this.starBaseBrightness[i] * (0.6 + 0.4 * flicker);
      starColorAttr.array[i * 3] = brightness;
      starColorAttr.array[i * 3 + 1] = brightness;
      starColorAttr.array[i * 3 + 2] = brightness * 0.95;
    }
    starColorAttr.needsUpdate = true;

    this.nebula.rotation.y += deltaTime * 0.005;
    this.nebula.rotation.x += deltaTime * 0.002;
  }

  public dispose(): void {
    this.scene.remove(this.particles);
    this.scene.remove(this.starField);
    this.scene.remove(this.nebula);
    this.clearHighlight();
    (this.particles.geometry as THREE.BufferGeometry).dispose();
    (this.particles.material as THREE.Material).dispose();
    (this.starField.geometry as THREE.BufferGeometry).dispose();
    (this.starField.material as THREE.Material).dispose();
    (this.nebula.geometry as THREE.BufferGeometry).dispose();
    (this.nebula.material as THREE.Material).dispose();
  }
}
