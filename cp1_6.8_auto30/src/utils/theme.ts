import { ref, computed } from 'vue'

export interface ThemeColors {
  name: string
  background: string
  primary: string
  secondary: string
  accent: string
  text: string
  textMuted: string
  patterns: string[]
  navBg: string
  buttonHover: string
}

const themes: ThemeColors[] = [
  {
    name: '极光蓝紫',
    background: '#1a1a2e',
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#f093fb',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.6)',
    patterns: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a'],
    navBg: 'rgba(26, 26, 46, 0.7)',
    buttonHover: 'rgba(102, 126, 234, 0.3)'
  },
  {
    name: '日落橙红',
    background: '#1a1010',
    primary: '#f093fb',
    secondary: '#f5576c',
    accent: '#ffecd2',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.6)',
    patterns: ['#f5576c', '#f093fb', '#ff9a9e', '#fecfef', '#ffecd2', '#fcb69f', '#ff6a88', '#ff99ac'],
    navBg: 'rgba(26, 16, 16, 0.7)',
    buttonHover: 'rgba(245, 87, 108, 0.3)'
  },
  {
    name: '森林绿棕',
    background: '#101a10',
    primary: '#11998e',
    secondary: '#38ef7d',
    accent: '#c79081',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.6)',
    patterns: ['#11998e', '#38ef7d', '#56ab2f', '#a8e063', '#c79081', '#dfa579', '#434343', '#000000'],
    navBg: 'rgba(16, 26, 16, 0.7)',
    buttonHover: 'rgba(17, 153, 142, 0.3)'
  },
  {
    name: '赛博粉蓝',
    background: '#0a0a1a',
    primary: '#00dbde',
    secondary: '#fc00ff',
    accent: '#00f5d4',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.6)',
    patterns: ['#00dbde', '#fc00ff', '#00f5d4', '#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#00f5d4'],
    navBg: 'rgba(10, 10, 26, 0.7)',
    buttonHover: 'rgba(0, 219, 222, 0.3)'
  },
  {
    name: '黑白极简',
    background: '#121212',
    primary: '#ffffff',
    secondary: '#888888',
    accent: '#cccccc',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.5)',
    patterns: ['#ffffff', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#616161', '#424242', '#212121'],
    navBg: 'rgba(18, 18, 18, 0.7)',
    buttonHover: 'rgba(255, 255, 255, 0.15)'
  }
]

const currentThemeIndex = ref(0)

export const currentTheme = computed(() => themes[currentThemeIndex.value])

export const themeList = themes

export function setTheme(index: number): void {
  if (index >= 0 && index < themes.length) {
    currentThemeIndex.value = index
    applyThemeToRoot(themes[index])
  }
}

export function nextTheme(): void {
  currentThemeIndex.value = (currentThemeIndex.value + 1) % themes.length
  applyThemeToRoot(themes[currentThemeIndex.value])
}

export function getCurrentThemeIndex(): number {
  return currentThemeIndex.value
}

function applyThemeToRoot(theme: ThemeColors): void {
  const root = document.documentElement
  root.style.setProperty('--bg-color', theme.background)
  root.style.setProperty('--primary-color', theme.primary)
  root.style.setProperty('--secondary-color', theme.secondary)
  root.style.setProperty('--accent-color', theme.accent)
  root.style.setProperty('--text-color', theme.text)
  root.style.setProperty('--text-muted', theme.textMuted)
  root.style.setProperty('--nav-bg', theme.navBg)
  root.style.setProperty('--button-hover', theme.buttonHover)
}

export function initTheme(): void {
  applyThemeToRoot(themes[currentThemeIndex.value])
}
