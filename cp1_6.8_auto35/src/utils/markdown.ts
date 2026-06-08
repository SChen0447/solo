import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string;
  } catch {
    return content;
  }
}

export function generateExcerpt(content: string, maxLength = 60): string {
  const plainText = content
    .replace(/[#>*_`\-]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return plainText.length > maxLength
    ? plainText.slice(0, maxLength) + '...'
    : plainText;
}

export function highlightText(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}
