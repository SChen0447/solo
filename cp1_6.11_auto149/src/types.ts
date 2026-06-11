export interface Star {
  x: number;
  y: number;
  size: number;
  flickerFreq: number;
  opacity: number;
  phase: number;
}

export interface CelestialBody {
  name: string;
  type: 'star' | 'planet' | 'comet';
  longitude: number;
  latitude: number;
  mythology: string;
  color: string;
  size: number;
  x: number;
  y: number;
}

export interface Aspect {
  type: 'conjunction' | 'square' | 'opposition';
  source: CelestialBody;
  target: CelestialBody;
  color: string;
  label: string;
}

export interface ChartConfig {
  selectedStars: CelestialBody[];
  aspects: Aspect[];
  birthChart: string[];
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  rotationVelocity: number;
  currentRotation: number;
}

export const ZODIAC_SIGNS = [
  { name: '白羊座', symbol: '♈', startDeg: 0 },
  { name: '金牛座', symbol: '♉', startDeg: 30 },
  { name: '双子座', symbol: '♊', startDeg: 60 },
  { name: '巨蟹座', symbol: '♋', startDeg: 90 },
  { name: '狮子座', symbol: '♌', startDeg: 120 },
  { name: '处女座', symbol: '♍', startDeg: 150 },
  { name: '天秤座', symbol: '♎', startDeg: 180 },
  { name: '天蝎座', symbol: '♏', startDeg: 210 },
  { name: '射手座', symbol: '♐', startDeg: 240 },
  { name: '摩羯座', symbol: '♑', startDeg: 270 },
  { name: '水瓶座', symbol: '♒', startDeg: 300 },
  { name: '双鱼座', symbol: '♓', startDeg: 330 },
];

export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const PLANETS: Omit<CelestialBody, 'x' | 'y'>[] = [
  { name: '太阳', type: 'planet', longitude: 0, latitude: 0, mythology: '日神羲和，驾驭六龙之车巡行天际', color: '#ffd700', size: 6 },
  { name: '太阴', type: 'planet', longitude: 45, latitude: 2, mythology: '月神常羲，育十二月为天女', color: '#c0c0e0', size: 5 },
  { name: '辰星', type: 'planet', longitude: 90, latitude: -1, mythology: '水神共工之精，主智谋文书', color: '#88ccff', size: 3 },
  { name: '太白', type: 'planet', longitude: 135, latitude: 3, mythology: '金星之神，主杀伐战争', color: '#ffffff', size: 4 },
  { name: '荧惑', type: 'planet', longitude: 200, latitude: -2, mythology: '火神祝融之精，主灾变兵祸', color: '#ff6644', size: 4 },
  { name: '岁星', type: 'planet', longitude: 260, latitude: 1, mythology: '木神句芒之精，主生长仁德', color: '#ffaa44', size: 5 },
  { name: '镇星', type: 'planet', longitude: 320, latitude: -1, mythology: '土神后土之精，主信义封疆', color: '#ddbb66', size: 4 },
];

export const COMETS: Omit<CelestialBody, 'x' | 'y'>[] = [
  { name: '彗星·扫帚', type: 'comet', longitude: 170, latitude: 5, mythology: '扫帚星出，天下兵起，改朝换代之兆', color: '#aaddff', size: 3 },
  { name: '彗星·蚩尤旗', type: 'comet', longitude: 280, latitude: -4, mythology: '蚩尤之旗现，主大乱兵戈', color: '#ff8888', size: 3 },
];

export const ASPECT_TYPES: { type: Aspect['type']; label: string; color: string; angle: number }[] = [
  { type: 'conjunction', label: '合', color: '#ffd700', angle: 0 },
  { type: 'square', label: '刑', color: '#ff4444', angle: 90 },
  { type: 'opposition', label: '冲', color: '#4488ff', angle: 180 },
];

export const PROPHECY_TEMPLATES = [
  '岁星入{palace}宫，与{planet}{aspect}，主{domain}亨通。然{comet}横贯{direction}方，恐有暗流涌动，需防小人口舌。天象示：{stem}{branch}年生人，运势如{metaphor}，宜{action}，忌{avoid}。',
  '荧惑守{palace}宫，{planet}{aspect}于侧，{domain}之途多舛。{comet}掠过{direction}方，变数已生。观{stem}{branch}之命，如{metaphor}，当{action}，切莫{avoid}。',
  '太白与{planet}{aspect}于{palace}宫，主{domain}有贵人相助。{comet}隐于{direction}方暗处，不可不察。{stem}{branch}生人，命格{metaphor}，宜{action}，慎{avoid}。',
  '辰星入{palace}宫，与{planet}成{aspect}，{domain}运势渐明。{comet}现于{direction}方，乃变革之兆。{stem}{branch}之命，{metaphor}之象，宜{action}，忌{avoid}。',
  '镇星镇{palace}宫，{planet}{aspect}而至，{domain}根基渐固。然{comet}逆行{direction}方，需防反复。{stem}{branch}生人，命若{metaphor}，宜{action}，勿{avoid}。',
];

export const PALACES = ['命宫', '财帛', '兄弟', '田宅', '男女', '奴仆', '夫妻', '疾厄', '迁移', '官禄', '福德', '相貌'];
export const DOMAINS = ['事业', '爱情', '健康', '财运', '学业', '家运', '人际', '子嗣', '远行', '功名', '福报', '寿元'];
export const DIRECTIONS = ['东', '南', '西', '北', '东南', '东北', '西南', '西北'];
export const METAPHORS = ['旭日东升', '暗夜行舟', '春风化雨', '惊涛骇浪', '平湖秋月', '烈火淬金', '枯木逢春', '逆水行舟'];
export const ACTIONS = ['守正待时', '广结善缘', '静心修德', '奋发图强', '谨言慎行', '择善而从', '蓄势待发', '明辨是非'];
export const AVOIDS = ['急功近利', '轻信他人', '意气用事', '固步自封', '贪大求全', '独断专行', '犹豫不决', '好高骛远'];
