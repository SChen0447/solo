import * as THREE from 'three';
import { StarData, StarField } from './stars';

interface ConstellationData {
  name: string;
  myth: string;
}

const CONSTELLATION_MYTHS: ConstellationData[] = [
  {
    name: '猎户座',
    myth: '猎户俄里翁是海神波塞冬之子，以无敌的狩猎技艺闻名。他扬言要杀尽天下猛兽，引起大地女神盖亚的愤怒，派出巨蝎将他毒杀。宙斯将猎户升上星空，成为冬夜最壮丽的星座，与天蝎遥遥相对，永不同时出现。',
  },
  {
    name: '大熊座',
    myth: '仙女卡利斯托曾是月神阿尔忒弥斯的随从，被宙斯所爱后遭赫拉嫉妒，变为棕熊。她的儿子阿卡斯在林中遇见母熊举爪相迎，险些将她射杀。宙斯及时将母子化为星座，大熊永远在北天旋转，尾巴被拉长成为北斗七星。',
  },
  {
    name: '天鹅座',
    myth: '宙斯化身白天鹅降临人间，接近斯巴达王后勒达。天鹅展翼飞翔于银河之中，翅膀划过星光璀璨的河面。后来这只天鹅被放置在星空，十字形的身躯在夏夜银河中展翅高飞，天津四便是它明亮的尾羽。',
  },
  {
    name: '天琴座',
    myth: '俄耳甫斯是世间最伟大的音乐家，他的琴声能令百兽俯首、顽石落泪。妻子欧律狄刻不幸被毒蛇咬死，他只身赴冥府以琴声感动冥王，却在回程的最后一刻忍不住回头，永远失去了爱人。宙斯将他的七弦琴升上星空。',
  },
  {
    name: '天蝎座',
    myth: '猎户俄里翁狂妄地宣称要杀尽天下猛兽，大地女神盖亚从泥土中召唤出一只巨蝎。毒蝎悄然接近，用致命的毒刺刺穿了猎户的脚踝。众神将二者分别安置在天空的两端，当天蝎升起于东方地平线，猎户便沉入西方。',
  },
  {
    name: '仙女座',
    myth: '安德洛墨达是埃塞俄比亚公主，因母亲夸耀其美貌超过海中仙女，触怒波塞冬。她被锁链缚于海崖献祭海怪，英雄珀尔修斯驾飞马赶到，以美杜莎之首将海怪化为石头，解救了公主。她被升上星空，与珀尔修斯永恒相伴。',
  },
  {
    name: '双子座',
    myth: '卡斯托尔与波吕丢刻斯是一对孪生兄弟，一个是凡人，一个是不朽的神。卡斯托尔在战斗中阵亡，波吕丢刻斯请求宙斯让他与兄弟共享不朽。宙斯感动于他们的兄弟之爱，将二人化为星座，永远并肩闪耀在冬夜的天穹。',
  },
  {
    name: '天鹰座',
    myth: '天鹰是宙斯的忠实使者，曾携带着宙斯的雷霆飞翔于奥林匹斯山巅。它也被派往人间，将美少年伽倪墨得斯衔上神山，为众神斟酒。这只雄鹰被安置在银河之畔，牛郎星便是它胸前最耀眼的明珠，映照着千年的传说。',
  },
  {
    name: '狮子座',
    myth: '涅墨亚巨狮是提丰和蛇妖之子，刀枪不入，是赫拉克勒斯十二功业中的第一个挑战。英雄以蛮力扼住狮颈，将其勒死，并用狮爪剥下刀枪不入的狮皮作为自己的铠甲。宙斯将巨狮升上星空，春夜的正南方便能望见它威武的身姿。',
  },
  {
    name: '英仙座',
    myth: '珀尔修斯是宙斯之子，奉命斩杀蛇发女妖美杜莎。他借助雅典娜的铜盾倒映、赫尔墨斯的飞行凉鞋和冥王的隐身盔，趁美杜莎沉睡时割下她的头颅。从美杜莎的血液中飞出了天马珀伽索斯，珀尔修斯手持头颅的身影被永恒镌刻在星空中。',
  },
];

export class ConstellationManager {
  scene: THREE.Scene;
  starField: StarField;
  markedStars: StarData[] = [];
  markRings: THREE.Mesh[] = [];
  constellationLines: THREE.Line | null = null;
  constellationGlowLines: THREE.Line | null = null;
  allConstellations: {
    stars: StarData[];
    lines: THREE.Line;
    glowLines: THREE.Line;
    rings: THREE.Mesh[];
    name: string;
  }[] = [];
  constellationMode = false;
  currentConstellationIndex = 0;
  typewriterTimer: number | null = null;
  constellationTextEl: HTMLElement;
  constNameEl: HTMLElement;
  constMythEl: HTMLElement;

  constructor(scene: THREE.Scene, starField: StarField) {
    this.scene = scene;
    this.starField = starField;
    this.constellationTextEl = document.getElementById('constellationText')!;
    this.constNameEl = document.getElementById('constName')!;
    this.constMythEl = document.getElementById('constMyth')!;
  }

  addMark(star: StarData) {
    if (this.markedStars.find(s => s.id === star.id)) return;
    this.markedStars.push(star);
    this.createMarkRing(star);
    if (this.markedStars.length >= 3 && this.markedStars.length <= 6) {
      this.connectStars();
    }
  }

  createMarkRing(star: StarData) {
    const geo = new THREE.RingGeometry(3, 4, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(star.position);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    ring.userData.pulsePhase = 0;
    ring.userData.starId = star.id;
    this.markRings.push(ring);
    this.scene.add(ring);
  }

  connectStars() {
    this.clearCurrentLines();
    const points = this.markedStars.map(s => s.position.clone());
    points.push(points[0].clone());
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const lineMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
      dashSize: 3,
      gapSize: 2,
    });
    const line = new THREE.Line(geometry, lineMat);
    line.computeLineDistances();
    this.constellationLines = line;
    this.scene.add(line);

    const glowMat = new THREE.LineBasicMaterial({
      color: 0x00bfff,
      transparent: true,
      opacity: 0.35,
      linewidth: 1,
    });
    const glowLine = new THREE.Line(geometry.clone(), glowMat);
    glowLine.computeLineDistances();
    this.constellationGlowLines = glowLine;
    this.scene.add(glowLine);

    const mythData = CONSTELLATION_MYTHS[this.currentConstellationIndex % CONSTELLATION_MYTHS.length];
    this.showConstellationText(mythData.name, mythData.myth);
    this.currentConstellationIndex++;
  }

  clearCurrentLines() {
    if (this.constellationLines) {
      this.scene.remove(this.constellationLines);
      this.constellationLines.geometry.dispose();
      (this.constellationLines.material as THREE.Material).dispose();
      this.constellationLines = null;
    }
    if (this.constellationGlowLines) {
      this.scene.remove(this.constellationGlowLines);
      this.constellationGlowLines.geometry.dispose();
      (this.constellationGlowLines.material as THREE.Material).dispose();
      this.constellationGlowLines = null;
    }
  }

  showConstellationText(name: string, myth: string) {
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
    this.constNameEl.textContent = name;
    this.constMythEl.textContent = '';
    this.constellationTextEl.classList.add('visible');

    let charIndex = 0;
    const charsPerSecond = 2;
    const interval = 1000 / (120 / 60 * charsPerSecond);

    this.typewriterTimer = window.setInterval(() => {
      if (charIndex < myth.length) {
        this.constMythEl.textContent += myth[charIndex];
        charIndex++;
      } else {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
      }
    }, interval);
  }

  toggleMode() {
    this.constellationMode = !this.constellationMode;
    const toggle = document.getElementById('constellationToggle');
    if (toggle) {
      toggle.classList.toggle('active', this.constellationMode);
    }

    for (const c of this.allConstellations) {
      c.lines.visible = this.constellationMode;
      c.glowLines.visible = this.constellationMode;
      for (const ring of c.rings) {
        ring.visible = this.constellationMode;
      }
    }
  }

  saveCurrentConstellation() {
    if (this.markedStars.length >= 3 && this.constellationLines && this.constellationGlowLines) {
      const mythData = CONSTELLATION_MYTHS[(this.currentConstellationIndex - 1) % CONSTELLATION_MYTHS.length];
      this.allConstellations.push({
        stars: [...this.markedStars],
        lines: this.constellationLines,
        glowLines: this.constellationGlowLines,
        rings: [...this.markRings],
        name: mythData.name,
      });
      this.constellationLines = null;
      this.constellationGlowLines = null;
    }

    for (const ring of this.markRings) {
      this.scene.remove(ring);
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    }
    this.markedStars = [];
    this.markRings = [];
    this.constellationTextEl.classList.remove('visible');
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
  }

  resetAll() {
    this.saveCurrentConstellation();
    for (const c of this.allConstellations) {
      this.scene.remove(c.lines);
      c.lines.geometry.dispose();
      (c.lines.material as THREE.Material).dispose();
      this.scene.remove(c.glowLines);
      c.glowLines.geometry.dispose();
      (c.glowLines.material as THREE.Material).dispose();
      for (const ring of c.rings) {
        this.scene.remove(ring);
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      }
    }
    this.allConstellations = [];
    this.currentConstellationIndex = 0;
    this.constellationMode = false;
    const toggle = document.getElementById('constellationToggle');
    if (toggle) toggle.classList.remove('active');
  }

  async randomConstellation(): Promise<void> {
    this.saveCurrentConstellation();
    const count = 3 + Math.floor(Math.random() * 4);
    const brightStars = this.starField.getBrightStars(count);
    for (const star of brightStars) {
      this.addMark(star);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  update(time: number) {
    for (const ring of this.markRings) {
      const phase = ring.userData.pulsePhase as number;
      ring.userData.pulsePhase = phase + 0.063;
      const scale = 1.0 + 0.3 * Math.sin(phase);
      ring.scale.set(scale, scale, scale);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.4 * Math.sin(phase);
    }

    if (this.constellationMode) {
      for (const c of this.allConstellations) {
        const rotSpeed = 0.001;
        c.lines.rotation.y += rotSpeed;
        c.glowLines.rotation.y += rotSpeed;
      }
    }

    if (this.constellationLines) {
      const glowMat = this.constellationGlowLines?.material as THREE.LineBasicMaterial;
      if (glowMat) {
        glowMat.opacity = 0.25 + 0.15 * Math.sin(time * 2);
      }
    }
  }
}
