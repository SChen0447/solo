export function highlightText(text: string, keyword: string): React.ReactNode {
  if (!keyword.trim()) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(keyword)})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <span
        key={index}
        style={{
          backgroundColor: 'var(--color-highlight)',
          padding: '0 2px',
          borderRadius: '2px'
        }}
      >
        {part}
      </span>
    ) : (
      part
    )
  );
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
