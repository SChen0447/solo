export interface GeoPoint {
  country: string;
  countryCode: string;
  capital: string;
  lat: number;
  lon: number;
  temperature: number;
  historical: { year: number; temp: number }[];
}

const RAW_CLIMATE_DATA = [
  { country: '中国', countryCode: 'CN', capital: '北京', lat: 39.9042, lon: 116.4074, temperature: 13.1, baseTemp: 11.2 },
  { country: '美国', countryCode: 'US', capital: '华盛顿', lat: 38.9072, lon: -77.0369, temperature: 14.5, baseTemp: 12.8 },
  { country: '日本', countryCode: 'JP', capital: '东京', lat: 35.6762, lon: 139.6503, temperature: 16.8, baseTemp: 15.2 },
  { country: '德国', countryCode: 'DE', capital: '柏林', lat: 52.5200, lon: 13.4050, temperature: 10.2, baseTemp: 8.7 },
  { country: '法国', countryCode: 'FR', capital: '巴黎', lat: 48.8566, lon: 2.3522, temperature: 12.4, baseTemp: 10.8 },
  { country: '英国', countryCode: 'GB', capital: '伦敦', lat: 51.5074, lon: -0.1278, temperature: 11.6, baseTemp: 10.1 },
  { country: '意大利', countryCode: 'IT', capital: '罗马', lat: 41.9028, lon: 12.4964, temperature: 16.2, baseTemp: 14.5 },
  { country: '西班牙', countryCode: 'ES', capital: '马德里', lat: 40.4168, lon: -3.7038, temperature: 18.3, baseTemp: 16.1 },
  { country: '加拿大', countryCode: 'CA', capital: '渥太华', lat: 45.4215, lon: -75.6972, temperature: 6.8, baseTemp: 4.9 },
  { country: '俄罗斯', countryCode: 'RU', capital: '莫斯科', lat: 55.7558, lon: 37.6173, temperature: 5.8, baseTemp: 3.9 },
  { country: '巴西', countryCode: 'BR', capital: '巴西利亚', lat: -15.8267, lon: -47.9218, temperature: 25.6, baseTemp: 24.1 },
  { country: '印度', countryCode: 'IN', capital: '新德里', lat: 28.6139, lon: 77.2090, temperature: 29.4, baseTemp: 27.3 },
  { country: '澳大利亚', countryCode: 'AU', capital: '堪培拉', lat: -35.2809, lon: 149.1300, temperature: 16.1, baseTemp: 14.2 },
  { country: '韩国', countryCode: 'KR', capital: '首尔', lat: 37.5665, lon: 126.9780, temperature: 13.5, baseTemp: 11.8 },
  { country: '墨西哥', countryCode: 'MX', capital: '墨西哥城', lat: 19.4326, lon: -99.1332, temperature: 22.8, baseTemp: 21.2 },
  { country: '印度尼西亚', countryCode: 'ID', capital: '雅加达', lat: -6.2088, lon: 106.8456, temperature: 30.2, baseTemp: 28.9 },
  { country: '荷兰', countryCode: 'NL', capital: '阿姆斯特丹', lat: 52.3676, lon: 4.9041, temperature: 11.4, baseTemp: 9.8 },
  { country: '瑞士', countryCode: 'CH', capital: '伯尔尼', lat: 46.9480, lon: 7.4474, temperature: 8.7, baseTemp: 7.1 },
  { country: '瑞典', countryCode: 'SE', capital: '斯德哥尔摩', lat: 59.3293, lon: 18.0686, temperature: 6.1, baseTemp: 4.3 },
  { country: '挪威', countryCode: 'NO', capital: '奥斯陆', lat: 59.9139, lon: 10.7522, temperature: 5.4, baseTemp: 3.6 },
  { country: '波兰', countryCode: 'PL', capital: '华沙', lat: 52.2297, lon: 21.0122, temperature: 9.2, baseTemp: 7.5 },
  { country: '土耳其', countryCode: 'TR', capital: '安卡拉', lat: 39.9334, lon: 32.8597, temperature: 14.6, baseTemp: 12.7 },
  { country: '阿根廷', countryCode: 'AR', capital: '布宜诺斯艾利斯', lat: -34.6037, lon: -58.3816, temperature: 20.8, baseTemp: 19.1 },
  { country: '南非', countryCode: 'ZA', capital: '比勒陀利亚', lat: -25.7479, lon: 28.2293, temperature: 22.5, baseTemp: 20.7 },
  { country: '埃及', countryCode: 'EG', capital: '开罗', lat: 30.0444, lon: 31.2357, temperature: 28.9, baseTemp: 26.8 },
  { country: '尼日利亚', countryCode: 'NG', capital: '阿布贾', lat: 9.0765, lon: 7.3986, temperature: 31.5, baseTemp: 29.8 },
  { country: '肯尼亚', countryCode: 'KE', capital: '内罗毕', lat: -1.2921, lon: 36.8219, temperature: 26.7, baseTemp: 25.1 },
  { country: '沙特阿拉伯', countryCode: 'SA', capital: '利雅得', lat: 24.7136, lon: 46.6753, temperature: 33.8, baseTemp: 31.5 },
  { country: '阿联酋', countryCode: 'AE', capital: '阿布扎比', lat: 24.4539, lon: 54.3773, temperature: 35.2, baseTemp: 33.1 },
  { country: '以色列', countryCode: 'IL', capital: '耶路撒冷', lat: 31.7683, lon: 35.2137, temperature: 22.4, baseTemp: 20.5 },
  { country: '新加坡', countryCode: 'SG', capital: '新加坡', lat: 1.3521, lon: 103.8198, temperature: 31.8, baseTemp: 30.2 },
  { country: '泰国', countryCode: 'TH', capital: '曼谷', lat: 13.7563, lon: 100.5018, temperature: 33.2, baseTemp: 31.4 },
  { country: '越南', countryCode: 'VN', capital: '河内', lat: 21.0285, lon: 105.8542, temperature: 29.6, baseTemp: 27.9 },
  { country: '菲律宾', countryCode: 'PH', capital: '马尼拉', lat: 14.5995, lon: 120.9842, temperature: 32.1, baseTemp: 30.3 },
  { country: '马来西亚', countryCode: 'MY', capital: '吉隆坡', lat: 3.1390, lon: 101.6869, temperature: 32.8, baseTemp: 31.1 },
  { country: '新西兰', countryCode: 'NZ', capital: '惠灵顿', lat: -41.2866, lon: 174.7756, temperature: 12.9, baseTemp: 11.2 },
  { country: '爱尔兰', countryCode: 'IE', capital: '都柏林', lat: 53.3498, lon: -6.2603, temperature: 10.5, baseTemp: 9.0 },
  { country: '芬兰', countryCode: 'FI', capital: '赫尔辛基', lat: 60.1699, lon: 24.9384, temperature: 4.9, baseTemp: 3.0 },
  { country: '丹麦', countryCode: 'DK', capital: '哥本哈根', lat: 55.6761, lon: 12.5683, temperature: 8.9, baseTemp: 7.3 },
  { country: '葡萄牙', countryCode: 'PT', capital: '里斯本', lat: 38.7223, lon: -9.1393, temperature: 18.7, baseTemp: 16.8 },
  { country: '希腊', countryCode: 'GR', capital: '雅典', lat: 37.9838, lon: 23.7275, temperature: 20.6, baseTemp: 18.7 },
  { country: '奥地利', countryCode: 'AT', capital: '维也纳', lat: 48.2082, lon: 16.3738, temperature: 10.4, baseTemp: 8.8 },
  { country: '比利时', countryCode: 'BE', capital: '布鲁塞尔', lat: 50.8503, lon: 4.3517, temperature: 11.3, baseTemp: 9.7 },
  { country: '捷克', countryCode: 'CZ', capital: '布拉格', lat: 50.0755, lon: 14.4378, temperature: 9.8, baseTemp: 8.2 },
  { country: '智利', countryCode: 'CL', capital: '圣地亚哥', lat: -33.4489, lon: -70.6693, temperature: 17.2, baseTemp: 15.5 },
  { country: '哥伦比亚', countryCode: 'CO', capital: '波哥大', lat: 4.7110, lon: -74.0721, temperature: 23.5, baseTemp: 21.9 },
  { country: '秘鲁', countryCode: 'PE', capital: '利马', lat: -12.0464, lon: -77.0428, temperature: 24.8, baseTemp: 23.2 },
  { country: '摩洛哥', countryCode: 'MA', capital: '拉巴特', lat: 34.0209, lon: -6.8416, temperature: 23.7, baseTemp: 21.8 },
  { country: '乌克兰', countryCode: 'UA', capital: '基辅', lat: 50.4501, lon: 30.5234, temperature: 8.3, baseTemp: 6.5 },
  { country: '巴基斯坦', countryCode: 'PK', capital: '伊斯兰堡', lat: 33.6844, lon: 73.0479, temperature: 27.9, baseTemp: 25.8 },
  { country: '孟加拉国', countryCode: 'BD', capital: '达卡', lat: 23.8103, lon: 90.4125, temperature: 31.6, baseTemp: 29.7 }
];

function generateHistorical(baseTemp: number, currentTemp: number): { year: number; temp: number }[] {
  const data: { year: number; temp: number }[] = [];
  const startYear = 1960;
  const endYear = 2024;
  const totalYears = endYear - startYear;
  const delta = currentTemp - baseTemp;

  for (let i = 0; i <= totalYears; i++) {
    const year = startYear + i;
    const progress = i / totalYears;
    const trend = baseTemp + delta * Math.pow(progress, 1.4);
    const noise = (Math.sin(year * 0.8) * 0.3 + Math.cos(year * 1.3) * 0.2);
    data.push({ year, temp: Math.round((trend + noise) * 10) / 10 });
  }
  return data;
}

export function loadClimateData(): GeoPoint[] {
  return RAW_CLIMATE_DATA.map(item => ({
    country: item.country,
    countryCode: item.countryCode,
    capital: item.capital,
    lat: item.lat,
    lon: item.lon,
    temperature: item.temperature,
    historical: generateHistorical(item.baseTemp, item.temperature)
  }));
}

export function getTemperatureColor(temp: number): string {
  const clamped = Math.max(-10, Math.min(40, temp));
  const t = (clamped + 10) / 50;
  const r = Math.round(0 + (255 - 0) * t);
  const g = Math.round(68 + (68 - 68) * (1 - t) * 0.3);
  const b = Math.round(255 * (1 - t));
  return `rgb(${r}, ${g}, ${b})`;
}

export function getTemperatureColorHex(temp: number): number {
  const clamped = Math.max(-10, Math.min(40, temp));
  const t = (clamped + 10) / 50;
  const r = Math.round(0 + (255 - 0) * t);
  const g = Math.round(68 + (68 - 68) * (1 - t) * 0.3);
  const b = Math.round(255 * (1 - t));
  return (r << 16) | (g << 8) | b;
}

export const ANALYSIS_TEMPLATES = [
  '过去60年间，该国气温显著上升，极端高温事件频发，对农业生产和城市基础设施构成严峻挑战。建议加强气候适应能力建设。',
  '数据表明，该国变暖速率高于全球平均水平，冬季升温尤为明显。生态系统正在经历快速变化，物种分布向高纬度和高海拔迁移。',
  '气候模型预测显示，如果温室气体排放不加以控制，该国到2100年气温可能再上升3-5°C，海平面上升将威胁沿海地区。',
  '近年来该国热浪持续时间和强度均创下历史记录，公共健康面临巨大压力，能源消耗峰值不断刷新。',
  '降水模式发生显著改变，干旱与洪涝交替出现，水资源管理成为首要议题。传统农业面临转型压力。'
];

export function getAnalysisText(): string {
  return ANALYSIS_TEMPLATES[Math.floor(Math.random() * ANALYSIS_TEMPLATES.length)];
}
