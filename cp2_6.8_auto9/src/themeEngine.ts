export interface ColorVariable {
  name: string;
  value: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  colors: ColorVariable[];
}

const sampleCss = `
:root {
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --secondary: #64748b;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg: #ffffff;
  --bg-secondary: #f8fafc;
  --text: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --card-bg: #ffffff;
  --nav-bg: #ffffff;
  --input-bg: #ffffff;
}
`;

const presets: ThemePreset[] = [
  {
    id: 'default',
    name: '默认蓝',
    colors: [
      { name: '--primary', value: '#3b82f6' },
      { name: '--primary-hover', value: '#2563eb' },
      { name: '--secondary', value: '#64748b' },
      { name: '--success', value: '#22c55e' },
      { name: '--warning', value: '#f59e0b' },
      { name: '--danger', value: '#ef4444' },
      { name: '--bg', value: '#ffffff' },
      { name: '--bg-secondary', value: '#f8fafc' },
      { name: '--text', value: '#1e293b' },
      { name: '--text-secondary', value: '#64748b' },
      { name: '--border', value: '#e2e8f0' },
      { name: '--card-bg', value: '#ffffff' },
      { name: '--nav-bg', value: '#ffffff' },
      { name: '--input-bg', value: '#ffffff' },
    ],
  },
  {
    id: 'dark',
    name: '暗黑模式',
    colors: [
      { name: '--primary', value: '#60a5fa' },
      { name: '--primary-hover', value: '#3b82f6' },
      { name: '--secondary', value: '#94a3b8' },
      { name: '--success', value: '#4ade80' },
      { name: '--warning', value: '#fbbf24' },
      { name: '--danger', value: '#f87171' },
      { name: '--bg', value: '#0f172a' },
      { name: '--bg-secondary', value: '#1e293b' },
      { name: '--text', value: '#f1f5f9' },
      { name: '--text-secondary', value: '#94a3b8' },
      { name: '--border', value: '#334155' },
      { name: '--card-bg', value: '#1e293b' },
      { name: '--nav-bg', value: '#1e293b' },
      { name: '--input-bg', value: '#0f172a' },
    ],
  },
  {
    id: 'warm-sun',
    name: '暖阳模式',
    colors: [
      { name: '--primary', value: '#f97316' },
      { name: '--primary-hover', value: '#ea580c' },
      { name: '--secondary', value: '#a16207' },
      { name: '--success', value: '#65a30d' },
      { name: '--warning', value: '#eab308' },
      { name: '--danger', value: '#dc2626' },
      { name: '--bg', value: '#fffbeb' },
      { name: '--bg-secondary', value: '#fef3c7' },
      { name: '--text', value: '#78350f' },
      { name: '--text-secondary', value: '#92400e' },
      { name: '--border', value: '#fde68a' },
      { name: '--card-bg', value: '#fef3c7' },
      { name: '--nav-bg', value: '#fef3c7' },
      { name: '--input-bg', value: '#fffbeb' },
    ],
  },
  {
    id: 'ocean-aurora',
    name: '海洋极光',
    colors: [
      { name: '--primary', value: '#06b6d4' },
      { name: '--primary-hover', value: '#0891b2' },
      { name: '--secondary', value: '#0ea5e9' },
      { name: '--success', value: '#10b981' },
      { name: '--warning', value: '#f59e0b' },
      { name: '--danger', value: '#f43f5e' },
      { name: '--bg', value: '#0c4a6e' },
      { name: '--bg-secondary', value: '#075985' },
      { name: '--text', value: '#e0f2fe' },
      { name: '--text-secondary', value: '#7dd3fc' },
      { name: '--border', value: '#0369a1' },
      { name: '--card-bg', value: '#075985' },
      { name: '--nav-bg', value: '#0c4a6e' },
      { name: '--input-bg', value: '#0c4a6e' },
    ],
  },
  {
    id: 'macaron',
    name: '马卡龙',
    colors: [
      { name: '--primary', value: '#f472b6' },
      { name: '--primary-hover', value: '#ec4899' },
      { name: '--secondary', value: '#a78bfa' },
      { name: '--success', value: '#86efac' },
      { name: '--warning', value: '#fcd34d' },
      { name: '--danger', value: '#fca5a5' },
      { name: '--bg', value: '#fdf4ff' },
      { name: '--bg-secondary', value: '#fae8ff' },
      { name: '--text', value: '#831843' },
      { name: '--text-secondary', value: '#be185d' },
      { name: '--border', value: '#f9a8d4' },
      { name: '--card-bg', value: '#fae8ff' },
      { name: '--nav-bg', value: '#fae8ff' },
      { name: '--input-bg', value: '#fdf4ff' },
    ],
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    colors: [
      { name: '--primary', value: '#00ff9f' },
      { name: '--primary-hover', value: '#00e5a0' },
      { name: '--secondary', value: '#bc13fe' },
      { name: '--success', value: '#00ff9f' },
      { name: '--warning', value: '#fcee0a' },
      { name: '--danger', value: '#ff003c' },
      { name: '--bg', value: '#0d0221' },
      { name: '--bg-secondary', value: '#1a0533' },
      { name: '--text', value: '#00ff9f' },
      { name: '--text-secondary', value: '#bc13fe' },
      { name: '--border', value: '#bc13fe' },
      { name: '--card-bg', value: '#1a0533' },
      { name: '--nav-bg', value: '#0d0221' },
      { name: '--input-bg', value: '#0d0221' },
    ],
  },
  {
    id: 'forest',
    name: '森林绿意',
    colors: [
      { name: '--primary', value: '#16a34a' },
      { name: '--primary-hover', value: '#15803d' },
      { name: '--secondary', value: '#65a30d' },
      { name: '--success', value: '#22c55e' },
      { name: '--warning', value: '#ca8a04' },
      { name: '--danger', value: '#dc2626' },
      { name: '--bg', value: '#f0fdf4' },
      { name: '--bg-secondary', value: '#dcfce7' },
      { name: '--text', value: '#14532d' },
      { name: '--text-secondary', value: '#166534' },
      { name: '--border', value: '#86efac' },
      { name: '--card-bg', value: '#dcfce7' },
      { name: '--nav-bg', value: '#dcfce7' },
      { name: '--input-bg', value: '#f0fdf4' },
    ],
  },
];

export function parseCssVariables(cssText: string): ColorVariable[] {
  const variables: ColorVariable[] = [];
  const rootMatch = cssText.match(/:root\s*{([^}]+)}/s);
  if (!rootMatch) return variables;

  const rootContent = rootMatch[1];
  const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = varRegex.exec(rootContent)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    if (/^#|^rgba?|^hsl/.test(value)) {
      variables.push({ name, value });
    }
  }

  return variables;
}

export function getPresetThemes(): ThemePreset[] {
  return presets;
}

export function getDefaultTheme(): ColorVariable[] {
  return presets[0].colors;
}

export function getSampleCss(): string {
  return sampleCss;
}

export function applyVariablesToRoot(variables: ColorVariable[]): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  variables.forEach((v) => {
    root.style.setProperty(v.name, v.value);
  });
}

export function generateExportCss(variables: ColorVariable[]): string {
  const lines = variables.map((v) => `  ${v.name}: ${v.value};`).join('\n');
  return `:root {\n${lines}\n}\n`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadCssFile(variables: ColorVariable[], filename = 'theme.css'): void {
  const css = generateExportCss(variables);
  const blob = new Blob([css], { type: 'text/css' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function isColorsEqual(a: ColorVariable[], b: ColorVariable[]): boolean {
  if (a.length !== b.length) return false;
  const mapA = new Map(a.map((v) => [v.name, v.value]));
  for (const v of b) {
    if (mapA.get(v.name) !== v.value) return false;
  }
  return true;
}
