import { css } from '@emotion/react'

export const NOTE_COLORS = [
  '#FFE0B2',
  '#FFCCBC',
  '#F8BBD0',
  '#D1C4E9',
  '#C5CAE9',
  '#B2DFDB',
] as const

export const theme = {
  bg: '#F5F5F5',
  sidebarBg: '#FFFFFF',
  text: '#2D3748',
  textMuted: '#718096',
  border: '#E2E8F0',
  shadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  shadowHover: '0 8px 24px rgba(0, 0, 0, 0.12)',
  shadowDragging: '0 20px 48px rgba(0, 0, 0, 0.18)',
  radius: '8px',
  noteWidth: 240,
  gridSize: 20,
}

export const globalStyles = css`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
    min-width: 1024px;
    overflow: hidden;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
      'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    background-color: ${theme.bg};
    color: ${theme.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    background: none;
  }

  input, textarea {
    font-family: inherit;
    outline: none;
    border: none;
    resize: none;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #CBD5E0;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #A0AEC0;
  }

  @keyframes pulseHighlight {
    0%, 100% {
      transform: scale(1);
      box-shadow: ${theme.shadow};
    }
    50% {
      transform: scale(1.06);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3), ${theme.shadowHover};
    }
  }

  @keyframes scaleIn {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    60% {
      transform: scale(1.08);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes fadeSlideIn {
    0% {
      opacity: 0;
      transform: translateX(-12px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }
`
