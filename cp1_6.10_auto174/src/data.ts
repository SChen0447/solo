export interface Cabin {
  id: string;
  name: string;
  imageUrl: string;
  beds: number;
  booked: number;
  description: string;
  price: number;
  lat: number;
  lng: number;
}

const STORAGE_KEY = 'cabin-diary-data';

const defaultCabins: Cabin[] = [
  {
    id: 'c1',
    name: '松林小筑',
    imageUrl: 'https://placehold.co/600x400/8B7355/FFFFFF?text=Cabin+1',
    beds: 4,
    booked: 1,
    description: '隐匿于松林中的温馨小木屋，清晨可闻鸟鸣，夜晚仰望星空。木质家具与暖色调灯光营造出舒适宜人的氛围，是远离城市喧嚣的绝佳去处。',
    price: 388,
    lat: 30.2741,
    lng: 120.1551
  },
  {
    id: 'c2',
    name: '湖畔木屋',
    imageUrl: 'https://placehold.co/600x400/5D8AA8/FFFFFF?text=Cabin+2',
    beds: 6,
    booked: 2,
    description: '依湖而建的独立木屋，推窗即见湖光山色。配有私人露台和户外桌椅，傍晚可欣赏日落倒映湖面的美景，适合家庭或朋友小聚。',
    price: 568,
    lat: 30.2841,
    lng: 120.1751
  },
  {
    id: 'c3',
    name: '山居岁月',
    imageUrl: 'https://placehold.co/600x400/A0522D/FFFFFF?text=Cabin+3',
    beds: 3,
    booked: 3,
    description: '位于半山腰的古朴木屋，周围环绕茶园与竹林。原木结构保留了自然的纹理和气息，屋内陈设简约而不失温馨，体验真正的山居生活。',
    price: 298,
    lat: 30.2641,
    lng: 120.1451
  },
  {
    id: 'c4',
    name: '星空营地',
    imageUrl: 'https://placehold.co/600x400/4A4A6A/FFFFFF?text=Cabin+4',
    beds: 5,
    booked: 0,
    description: '专为观星爱好者打造的木屋，拥有全景玻璃天窗。夜晚躺在床上即可仰望银河，室内配备专业天文望远镜，是摄影爱好者和浪漫情侣的理想之选。',
    price: 458,
    lat: 30.2941,
    lng: 120.1851
  },
  {
    id: 'c5',
    name: '枫林别院',
    imageUrl: 'https://placehold.co/600x400/8B0000/FFFFFF?text=Cabin+5',
    beds: 4,
    booked: 2,
    description: '坐落于枫林中的雅致别院，每到秋季红叶满山，宛如童话世界。木屋带有独立庭院和温泉泡池，四季皆有不同的美景等待您的探索。',
    price: 428,
    lat: 30.2541,
    lng: 120.1651
  }
];

export function getCabins(): Cabin[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Cabin[];
    }
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCabins));
  return defaultCabins;
}

export function updateCabin(id: string, newBookedCount: number): Cabin[] {
  const cabins = getCabins();
  const index = cabins.findIndex(c => c.id === id);
  if (index !== -1) {
    cabins[index] = {
      ...cabins[index],
      booked: Math.max(0, Math.min(cabins[index].beds, newBookedCount))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cabins));
  }
  return cabins;
}
