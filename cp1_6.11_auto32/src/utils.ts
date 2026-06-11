export const formatPrice = (price: number): string => {
  return '¥' + price.toLocaleString('zh-CN');
};

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const formatCountdown = (endTime: number): { text: string; urgent: boolean } => {
  const now = Date.now();
  const diff = endTime - now;

  if (diff <= 0) {
    return { text: '已结束', urgent: false };
  }

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  let text = '';
  if (hours > 0) {
    text = `${hours}时${minutes.toString().padStart(2, '0')}分${seconds.toString().padStart(2, '0')}秒`;
  } else if (minutes > 0) {
    text = `${minutes}分${seconds.toString().padStart(2, '0')}秒`;
  } else {
    text = `${seconds}秒`;
  }

  return { text, urgent: diff < 300000 };
};
