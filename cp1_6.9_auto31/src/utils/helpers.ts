export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

export const parseDate = (dateStr: string): Date => {
  const y = parseInt(dateStr.substring(0, 4));
  const m = parseInt(dateStr.substring(4, 6)) - 1;
  const d = parseInt(dateStr.substring(6, 8));
  return new Date(y, m, d);
};

export const displayDate = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
};

export const addDays = (dateStr: string, days: number): string => {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const getAvatarColor = (username: string): string => {
  const colors = ['#e67e22', '#27ae60', '#2980b9', '#8e44ad', '#c0392b', '#16a085', '#d35400', '#2c3e50'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const STICKER_CATEGORIES: Record<string, string[]> = {
  '植物': ['🌿', '🌱', '🌸', '🌹', '🌻', '🍀', '🌵'],
  '食物': ['🍰', '🍵', '🍜', '🍎', '🥐', '☕', '🍪'],
  '天气': ['☀️', '🌤️', '🌧️', '❄️', '🌈', '⚡', '🌙'],
  '心情': ['😊', '🥰', '😌', '🎉', '💭', '❤️', '✨'],
  '旅行': ['✈️', '🗺️', '🚄', '🏖️', '🏔️', '📷', '🎒'],
  '纪念日': ['🎂', '🎁', '💝', '🎊', '🎈', '🌟', '🏆']
};
