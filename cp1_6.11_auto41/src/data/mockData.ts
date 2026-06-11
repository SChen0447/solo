import { v4 as uuidv4 } from 'uuid';
import { AnchorPoint, CityDetailData } from '../types';

const buildingSvgs = [
  `M50,150 L50,80 L70,80 L70,60 L90,60 L90,80 L110,80 L110,60 L130,60 L130,80 L150,80 L150,150 Z M70,120 L90,120 M70,100 L90,100 M110,120 L130,120 M110,100 L130,100`,
  `M60,150 L60,50 L80,30 L100,50 L100,150 Z M70,130 L90,130 M70,110 L90,110 M70,90 L90,90 M70,70 L90,70`,
  `M40,150 L40,90 L60,90 L60,70 L80,50 L100,70 L100,90 L120,90 L120,70 L140,50 L160,70 L160,90 L160,150 Z`,
  `M50,150 L50,100 L70,100 L70,80 L90,80 L90,100 L110,100 L110,80 L130,80 L130,100 L150,100 L150,150 Z M60,130 L80,130 M60,115 L80,115 M120,130 L140,130 M120,115 L140,115`,
  `M75,150 L75,40 L125,40 L125,150 Z M85,130 L115,130 M85,110 L115,110 M85,90 L115,90 M85,70 L115,70 M85,55 L115,55`,
  `M50,150 Q50,100 100,100 Q150,100 150,150 Z M70,130 L130,130 M80,115 L120,115`,
];

const citiesData: Array<{ name: string; country: string; lat: number; lng: number; description: string }> = [
  { name: '罗马', country: '意大利', lat: 41.9028, lng: 12.4964, description: '永恒之城，见证古罗马帝国的辉煌' },
  { name: '京都', country: '日本', lat: 35.0116, lng: 135.7681, description: '千年古都，唐风遗韵的东方文化宝库' },
  { name: '开罗', country: '埃及', lat: 30.0444, lng: 31.2357, description: '金字塔下，尼罗河畔的文明摇篮' },
  { name: '雅典', country: '希腊', lat: 37.9838, lng: 23.7275, description: '西方文明的发源地，哲学与民主的摇篮' },
  { name: '巴黎', country: '法国', lat: 48.8566, lng: 2.3522, description: '浪漫之都，艺术与时尚的永恒象征' },
  { name: '伦敦', country: '英国', lat: 51.5074, lng: -0.1278, description: '日不落帝国的心脏，工业革命的起点' },
  { name: '北京', country: '中国', lat: 39.9042, lng: 116.4074, description: '六朝古都，东方文明的政治文化中心' },
  { name: '纽约', country: '美国', lat: 40.7128, lng: -74.0060, description: '不夜之城，现代都市文明的标杆' },
  { name: '里约热内卢', country: '巴西', lat: -22.9068, lng: -43.1729, description: '热情的桑巴之城，热带雨林与海洋的交融' },
  { name: '悉尼', country: '澳大利亚', lat: -33.8688, lng: 151.2093, description: '南半球的明珠，歌剧院与海港大桥的故乡' },
  { name: '雷克雅未克', country: '冰岛', lat: 64.1466, lng: -21.9426, description: '北极圈下的冰与火之歌，极光之城' },
  { name: '新加坡', country: '新加坡', lat: 1.3521, lng: 103.8198, description: '花园城市，东南亚的金融中心' },
  { name: '内罗毕', country: '肯尼亚', lat: -1.2921, lng: 36.8219, description: '东非大草原的门户，野生动物的天堂' },
  { name: '利马', country: '秘鲁', lat: -12.0464, lng: -77.0428, description: '印加帝国的遗产，安第斯山脉的明珠' },
  { name: '莫斯科', country: '俄罗斯', lat: 55.7558, lng: 37.6173, description: '红场与克里姆林宫，东欧的心脏' },
];

export const generateAnchors = (): AnchorPoint[] => {
  return citiesData.map(city => ({
    id: uuidv4(),
    cityName: city.name,
    description: city.description,
    lat: city.lat,
    lng: city.lng,
  }));
};

const generateHistoricalData = (cityName: string) => {
  const eras = [
    { year: -500, label: '公元前500年', desc: `${cityName}早期文明的萌芽，简陋的聚落逐渐形成` },
    { year: 0, label: '公元元年', desc: `${cityName}初具城市规模，贸易开始繁荣` },
    { year: 500, label: '公元500年', desc: `${cityName}成为区域中心，重要建筑相继落成` },
    { year: 1000, label: '公元1000年', desc: `${cityName}的黄金时代，文化艺术达到巅峰` },
    { year: 1500, label: '公元1500年', desc: `${cityName}经历变迁，古老建筑焕发新生` },
    { year: 1800, label: '公元1800年', desc: `${cityName}步入近代，工业革命带来新的面貌` },
  ];
  
  return eras.map((era, index) => ({
    year: era.year,
    yearLabel: era.label,
    opacity: 0,
    svgPath: buildingSvgs[index % buildingSvgs.length],
    description: era.desc,
  }));
};

const generatePresentData = () => {
  const weatherTypes = [
    { weather: '晴朗', icon: '☀️' },
    { weather: '多云', icon: '⛅' },
    { weather: '小雨', icon: '🌧️' },
    { weather: '阴天', icon: '☁️' },
    { weather: '微风', icon: '🍃' },
  ];
  const aqiLevels = ['优', '良', '轻度污染', '中度污染'];
  const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
  const randomAqiLevel = aqiLevels[Math.floor(Math.random() * aqiLevels.length)];
  
  return {
    temperature: Math.round(Math.random() * 30 + 5),
    humidity: Math.round(Math.random() * 40 + 40),
    aqi: Math.round(Math.random() * 150 + 20),
    aqiLevel: randomAqiLevel,
    weather: randomWeather.weather,
    weatherIcon: randomWeather.icon,
    updateTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  };
};

const generateFutureData = () => {
  const years = [2025, 2035, 2050, 2065, 2080, 2100];
  return years.map((year, index) => ({
    year,
    temperature: 15 + index * 1.2 + Math.random() * 0.5,
    seaLevel: index * 0.3 + Math.random() * 0.1,
    extremeWeather: 2 + index * 1.5,
  }));
};

export const fetchCityDetail = async (cityId: string): Promise<CityDetailData | null> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const anchors = generateAnchors();
  const anchor = anchors.find(a => a.id === cityId);
  if (!anchor) return null;
  
  const cityInfo = citiesData.find(c => c.name === anchor.cityName);
  
  return {
    id: cityId,
    cityName: anchor.cityName,
    country: cityInfo?.country || '未知',
    past: generateHistoricalData(anchor.cityName),
    present: generatePresentData(),
    future: generateFutureData(),
  };
};
