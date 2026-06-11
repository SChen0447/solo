export const theme = {
  colors: {
    walnutDark: '#6b4c3b',
    walnutMedium: '#8b6548',
    walnutLight: '#a67c5b',
    newspaper: '#e8dcc8',
    paper: '#faf3e0',
    paperDark: '#f0e6cc',
    maple: '#cba37a',
    mapleDark: '#b08860',
    gold: '#d4a853',
    goldLight: '#e8c878',
    inkBlack: '#1a1a1a',
    inkBlue: '#1e3a5f',
    inkRed: '#6b2020',
    inkBrown: '#5c4033',
    shadow: 'rgba(0,0,0,0.2)',
    shadowLight: 'rgba(0,0,0,0.1)'
  },
  radii: {
    md: '12px',
    sm: '8px',
    lg: '16px'
  },
  shadows: {
    card: '0 2px 8px rgba(0,0,0,0.2)',
    cardHover: '0 4px 16px rgba(0,0,0,0.25)',
    inset: 'inset 0 2px 4px rgba(0,0,0,0.1)'
  },
  breakpoints: {
    mobile: 768
  }
};

export const animations = {
  pageFadeIn: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.8, ease: 'easeOut' }
    }
  },
  letterFlip: {
    closed: {
      rotateY: 90,
      opacity: 0,
      transition: { duration: 0.6, ease: 'easeInOut' }
    },
    open: {
      rotateY: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeInOut' }
    }
  },
  featherWobble: {
    rest: { rotate: 0 },
    hover: {
      rotate: [-5, 5, -3, 3, 0],
      transition: {
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity
      }
    }
  },
  inkSpread: {
    initial: { scale: 0, opacity: 0.6 },
    animate: {
      scale: 4,
      opacity: 0,
      transition: { duration: 1.2, ease: 'easeOut' }
    }
  },
  stampBounce: {
    idle: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: { type: 'spring', stiffness: 400, damping: 10 }
    },
    drag: { scale: 1.1, rotate: 2 }
  },
  snapEffect: {
    snap: {
      scale: [1, 1.15, 1],
      transition: { duration: 0.3, ease: 'easeOut' }
    }
  },
  slideUp: {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  }
};

export const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  body {
    font-family: 'Noto Serif SC', serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .handwriting {
    font-family: 'Ma Shan Zheng', cursive;
  }

  @media (max-width: ${theme.breakpoints.mobile}px) {
    html, body, #root {
      overflow-y: auto;
    }
  }
`;

export const inkColors = [
  { id: 'black', name: '墨黑', color: theme.colors.inkBlack },
  { id: 'blue', name: '深蓝', color: theme.colors.inkBlue },
  { id: 'red', name: '暗红', color: theme.colors.inkRed },
  { id: 'brown', name: '金棕', color: theme.colors.inkBrown }
];

export const stampPatterns = [
  { id: 'train', name: '复古火车' },
  { id: 'lighthouse', name: '灯塔' },
  { id: 'sailboat', name: '帆船' },
  { id: 'rose', name: '玫瑰' }
];
