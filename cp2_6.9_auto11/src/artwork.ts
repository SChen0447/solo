import * as THREE from 'three';

export interface ArtworkData {
  id: string;
  title: string;
  author: string;
  description: string;
  colorA: number;
  colorB: number;
  pattern: 'solid' | 'checker' | 'gradient';
}

const ARTWORK_POOL: Omit<ArtworkData>[] = [
  {
    id: 'art-001',
    title: '晨曦之光',
    author: '林墨轩',
    description:
      '这幅作品捕捉了黎明时分第一缕阳光穿透云层的瞬间，画面以柔和的金色调和淡紫色调交织，展现出大自然苏醒时的宁静与希望。艺术家运用细腻的笔触，将光与影的边界变得模糊而富有诗意。',
    colorA: 0xffd700,
    colorB: 0x8b4513,
    pattern: 'gradient'
  },
  {
    id: 'art-002',
    title: '都市幻影',
    author: '苏雨晴',
    description:
      '描绘现代都市在夜色中的奇幻景象，霓虹灯的色彩在湿润街道上的倒影形成了一幅抽象的几何构图。冷蓝色与霓虹粉色的强烈对比，表达了都市生活的喧嚣与孤独并存的矛盾感。',
    colorA: 0x1e3a5f,
    colorB: 0xff6b9d,
    pattern: 'checker'
  },
  {
    id: 'art-003',
    title: '静谧山谷',
    author: '陈远山',
    description:
      '作品展现了深藏于群山之中的一片宁静山谷，晨雾缭绕，溪水潺潺。墨绿色的山峦层次分明，艺术家通过极简的色彩和构图，传达出一种超脱尘世的禅意氛围。',
    colorA: 0x2d5a27,
    colorB: 0x87ceeb,
    pattern: 'gradient'
  },
  {
    id: 'art-004',
    title: '时间的褶皱',
    author: '王静怡',
    description:
      '这是一幅关于时间概念的抽象表达，画面中层层叠叠的色块如同被折叠的时光，每一道褶皱都承载着一段记忆。暖金色与深褐色的搭配，唤起人们对逝去时光的温柔追忆。',
    colorA: 0xb8964f,
    colorB: 0x4a3728,
    pattern: 'checker'
  },
  {
    id: 'art-005',
    title: '深海之蓝',
    author: '刘海岚',
    description:
      '描绘深海中光线穿透水面的瞬间，蓝色的渐变从深蓝到浅蓝，象征着未知与探索。画面中隐约可见的生物形态，暗示着深海中生命的神秘与美丽。',
    colorA: 0x001f3f,
    colorB: 0x00bfff,
    pattern: 'gradient'
  },
  {
    id: 'art-006',
    title: '秋日私语',
    author: '张晓枫',
    description:
      '金秋时节，枫叶飘零，画面中金红色调铺满整个视野。艺术家以温暖的色彩语言，诉说着秋天独有的浪漫与淡淡的忧伤，每一片落叶都仿佛在轻声细语地讲述着生命轮回的故事。',
    colorA: 0xff6b35,
    colorB: 0xc7003f,
    pattern: 'gradient'
  },
  {
    id: 'art-007',
    title: '几何幻想',
    author: '赵启明',
    description:
      '以纯几何形式构建的抽象世界，立方体、球体、锥体在空间中相互碰撞与对话。冷银色与深黑色的主色调，展现出理性与秩序之美。',
    colorA: 0x2c3e50,
    colorB: 0x95a5a6,
    pattern: 'checker'
  },
  {
    id: 'art-008',
    title: '云端漫步',
    author: '孙云舒',
    description:
      '画面呈现了置身云端之上的梦幻场景，柔软的云朵如同棉花糖般飘浮，淡紫色与桃粉色的渐变营造出超现实的浪漫气息，让人仿佛置身仙境。',
    colorA: 0xe6b8ff,
    colorB: 0xffb6c1,
    pattern: 'gradient'
  },
  {
    id: 'art-009',
    title: '墨韵山水',
    author: '李墨白',
    description:
      '以中国传统水墨画的意境，用黑白灰的层次展现山水之美。留白之处韵味无穷，传达出东方美学中"less is more"的哲学思想。',
    colorA: 0x1a1a1a,
    colorB: 0xf5f5f5,
    pattern: 'gradient'
  },
  {
    id: 'art-010',
    title: '生命之树',
    author: '周叶青',
    description:
      '一棵枝繁叶茂的大树，根系深深扎入大地，枝叶向天空伸展。翠绿色与棕色的和谐搭配，象征着生命的力量与希望，也寓意着人与自然的和谐共生。',
    colorA: 0x228b22,
    colorB: 0x8b4513,
    pattern: 'checker'
  },
  {
    id: 'art-011',
    title: '星夜交响',
    author: '吴星辰',
    description:
      '夜空中繁星点点，银河横跨天际。深蓝色背景上闪烁的光点如同交响乐中的音符，共同演奏着宇宙的宏伟乐章，令人心生敬畏。',
    colorA: 0x0a0a2e,
    colorB: 0xffe4b5,
    pattern: 'checker'
  },
  {
    id: 'art-012',
    title: '古韵今风',
    author: '郑雨桐',
    description:
      '将传统东方元素与现代抽象语言的碰撞融合，画面中既保留了古典的韵味，又注入了当代的活力。朱红色与墨黑色调为主，展现出文化传承与创新的时代精神。',
    colorA: 0x8b0000,
    colorB: 0x2f2f2f,
    pattern: 'solid'
  },
  {
    id: 'art-013',
    title: '海岸线',
    author: '郑雨桐',
    description:
      '海浪轻抚沙滩，夕阳的余晖洒在海面上，形成金色的光带。橙红色的渐变，展现出大自然最温柔的一面。',
    colorA: 0xff7f50,
    colorB: 0x4169e1,
    pattern: 'gradient'
  },
  {
    id: 'art-014',
    title: '抽象构成 No.7',
    author: '冯立群',
    description:
      '纯粹的色彩与形式探索，画面不代表任何具体物象，只追求视觉感官的直接表达。大胆的色块组合挑战观者的视觉经验，让色彩本身成为主题。',
    colorA: 0xe74c3c,
    colorB: 0x3498db,
    pattern: 'checker'
  },
  {
    id: 'art-015',
    title: '竹林清风',
    author: '徐清风',
    description:
      '翠绿的竹林在微风中轻轻摇曳，阳光透过竹叶洒下斑驳光影。清新的绿色调让人感受到自然的呼吸，给人以心灵的净化之感。',
    colorA: 0x50c878,
    colorB: 0x2e8b57,
    pattern: 'solid'
  },
  {
    id: 'art-016',
    title: '红色记忆',
    author: '何丹红',
    description:
      '以不同层次的红色构建画面，从深红到浅粉的渐变，唤起人们心中那些热烈而深沉的情感共鸣。红色既是激情、是热情、也是警示、是回忆。',
    colorA: 0xdc143c,
    colorB: 0xffc0cb,
    pattern: 'gradient'
  },
  {
    id: 'art-017',
    title: '极地之光',
    author: '韩冰洋',
    description:
      '描绘极地极光在夜空中舞动的绚烂景象，绿色与紫色的光带交织，宛如天庭的烟火，神秘而壮丽。',
    colorA: 0x00ff7f,
    colorB: 0x9370db,
    pattern: 'gradient'
  },
  {
    id: 'art-018',
    title: '城市脉搏',
    author: '高志明',
    description:
      '抽象表达现代都市的节奏感，几何线条与色块的交织，如同城市脉搏的跳动。灰色系为主色调，展现现代建筑的硬朗与都市生活的快节奏。',
    colorA: 0x34495e,
    colorB: 0xecf0f1,
    pattern: 'checker'
  },
  {
    id: 'art-019',
    title: '花之絮语',
    description:
      '花瓣在春风中轻轻飘落，粉色系的柔和色调营造出浪漫诗意的氛围。每一片花瓣都仿佛在轻声诉说着春天的故事。',
    author: '蒋春燕',
    colorA: 0xffb7c5,
    colorB: 0x98d8c8,
    pattern: 'solid'
  },
  {
    id: 'art-020',
    title: '宇宙尘埃',
    author: '宋宇航',
    description:
      '宇宙深处的星云与尘埃，在黑暗中闪烁着神秘光芒。深紫与深蓝的主色调，让人感受到宇宙的浩瀚与人类的渺小。',
    colorA: 0x2c1654,
    colorB: 0x4a90a4,
    pattern: 'checker'
  },
  {
    id: 'art-021',
    title: '田野之歌',
    author: '田野',
    description:
      '金色的麦浪在微风中起伏，阳光洒落，鸟声如歌。暖黄色调传递出丰收的喜悦和对土地的深厚情感。',
    colorA: 0xdaa520,
    colorB: 0x6b8e23,
    pattern: 'gradient'
  },
  {
    id: 'art-022',
    title: '光之瀑布',
    author: '谢光明',
    description:
      '光线如同瀑布般从高处倾泻而下，穿过层层叠叠的光束形成壮观的视觉奇观。白色与金色的交织，带来神圣而庄严的氛围。',
    colorA: 0xfff8dc,
    colorB: 0x4682b4,
    pattern: 'gradient'
  },
  {
    id: 'art-023',
    title: '梦境花园',
    author: '沈梦瑶',
    description:
      '超现实主义的花园场景，奇异的花朵和梦幻的色彩。粉紫色调营造出梦幻般的氛围，让人分不清是梦还是真。',
    colorA: 0xd8bfd8,
    colorB: 0xff69b4,
    pattern: 'solid'
  },
  {
    id: 'art-024',
    title: '冬日暖阳',
    author: '杨冬梅',
    description:
      '寒冷冬日里的一抹暖阳，透过光秃的树枝，带来温暖的光线。冷暖对比的色调，传达出在困境中寻找希望的主题。',
    colorA: 0xb0c4de,
    colorB: 0xffa500,
    pattern: 'gradient'
  },
  {
    id: 'art-025',
    title: '印象·构成',
    author: '方逸飞',
    description:
      '融合印象派的色彩与构成主义的形式，画面既有光影斑驳又结构严谨，是传统与现代的完美对话。',
    colorA: 0xcd853f,
    colorB: 0x483d8b,
    pattern: 'checker'
  },
  {
    id: 'art-026',
    title: '雨后彩虹',
    author: '曾彩虹',
    description:
      '雨后天晴，彩虹横跨天际。七彩渐变的色彩，展现出大自然最美丽的瞬间，给人以希望与美好。',
    colorA: 0x87ceeb,
    colorB: 0x90ee90,
    pattern: 'gradient'
  },
  {
    id: 'art-027',
    title: '金属幻想曲',
    author: '马铁军',
    description:
      '以金属质感的冷色调为基调，银灰色与深蓝色的搭配，展现出工业时代的力量感与未来科技的冷峻之美。',
    colorA: 0x708090,
    colorB: 0x000080,
    pattern: 'checker'
  },
  {
    id: 'art-028',
    title: '水墨丹青',
    author: '丹青',
    description:
      '融合中国传统水墨与丹青的技法，山水意境深远。墨色浓淡变化，展现东方美学的独特韵味。',
    colorA: 0x2f4f4f,
    colorB: 0xff6347,
    pattern: 'gradient'
  },
  {
    id: 'art-029',
    title: '热带风情',
    author: '范热带',
    description:
      '热带雨林的丰富色彩，浓郁的绿色与鲜艳的花朵色彩交织，充满了生命的活力与热带的热情。',
    colorA: 0x006400,
    colorB: 0xff4500,
    pattern: 'solid'
  },
  {
    id: 'art-030',
    title: '永恒之境',
    author: '彭永恒',
    description:
      '探索永恒这一哲学命题的视觉呈现，画面简洁而深刻。蓝金色调为主，传达出一种超越时间的宁静与深远。',
    colorA: 0x191970,
    colorB: 0xd4af37,
    pattern: 'gradient'
  }
];

let _artworkIndex = 0;

export function getNextArtwork(): ArtworkData {
  const data = ARTWORK_POOL[_artworkIndex % ARTWORK_POOL.length];
  _artworkIndex++;
  return { ...data };
}

export function resetArtworkPool(): void {
  _artworkIndex = 0;
}

export function createArtworkTexture(
  data: ArtworkData,
  width: number = 512,
  height: number = 512
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(width, 1024);
  canvas.height = Math.min(height, 1024);
  const ctx = canvas.getContext('2d')!;

  const colorA = '#' + data.colorA.toString(16).padStart(6, '0');
  const colorB = '#' + data.colorB.toString(16).padStart(6, '0');

  if (data.pattern === 'solid') {
    ctx.fillStyle = colorA;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const grd = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2
    );
    grd.addColorStop(0, 'rgba(255,255,255,0.15)');
    grd.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (data.pattern === 'checker') {
    const tileSize = 64;
    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        const isAlt = ((x / tileSize + y / tileSize) % 2 === 0;
        ctx.fillStyle = isAlt ? colorA : colorB;
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
    const overlay = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0, canvas.width / 2,
      canvas.height / 2, canvas.width / 2
    );
    overlay.addColorStop(0, 'rgba(0,0,0,0)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, colorA);
    grd.addColorStop(1, colorB);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const vignette = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.2, canvas.width / 2,
      canvas.height / 2, canvas.width * 0.75
    );
    vignette.addColorStop(0, 'rgba(255,255,255,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    const x1 = Math.random() * canvas.width;
    const y1 = Math.random() * canvas.height;
    const x2 = Math.random() * canvas.width;
    const y2 = Math.random() * canvas.height;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
