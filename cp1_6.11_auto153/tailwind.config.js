/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        deepSpace: '#1e1e1e',
        deepBlue: '#0d1b2a',
        accent: '#4a9eff',
        accentLight: '#8cb4ff',
        muteRed: '#ff4d4d',
        soloYellow: '#ffaa00',
        highFreqPurple: '#b366ff',
        glowLine: '#3a5a8a',
        trackBg: 'rgba(30,30,30,0.6)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.2s ease-in-out infinite',
        'elastic-bounce': 'elastic-bounce 0.4s ease-out',
        'glow-border': 'glow-border 1.2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 4px #4a9eff, 0 0 8px rgba(74,158,255,0.3)' },
          '50%': { boxShadow: '0 0 12px #4a9eff, 0 0 24px rgba(74,158,255,0.5)' },
        },
        'elastic-bounce': {
          '0%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1.0)' },
        },
        'glow-border': {
          '0%, 100%': { borderColor: 'rgba(74,158,255,0.3)' },
          '50%': { borderColor: 'rgba(74,158,255,0.8)' },
        },
      },
    },
  },
  plugins: [],
};
