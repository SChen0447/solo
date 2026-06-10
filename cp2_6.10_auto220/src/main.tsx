import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';
import type { ChallengeCard, Theme, Comment } from './types';
import ThemeCard from './components/ThemeCard';
import SubmissionForm from './components/SubmissionForm';
import ChallengeBoard from './components/ChallengeBoard';
import RankingList from './components/RankingList';

const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

const PRESET_THEMES: Theme[] = [
  { id: 't1', name: '加勒比海风味闪电泡芙', description: '热带风情的酥脆泡芙' },
  { id: 't2', name: '薰衣草蜂蜜马卡龙', description: '法式浪漫的精致甜点' },
  { id: 't3', name: '抹茶红豆熔岩蛋糕', description: '日式抹茶与红豆的完美结合' },
  { id: 't4', name: '玫瑰荔枝奶油塔', description: '花香与果香的优雅碰撞' },
  { id: 't5', name: '焦糖海盐布朗尼', description: '咸甜交织的浓郁口感' },
  { id: 't6', name: '百香果椰香慕斯', description: '清爽热带风情的轻盈慕斯' },
  { id: 't7', name: '黑松露巧克力蛋糕', description: '奢华的高级甜点体验' },
  { id: 't8', name: '芒果糯米糍', description: '东南亚风味的软糯甜品' },
  { id: 't9', name: '伯爵茶奶冻卷', description: '英式茶香与绵密蛋糕' },
  { id: 't10', name: '覆盆子白巧克力挞', description: '酸甜平衡的精致挞品' },
  { id: 't11', name: '桂花酒酿舒芙蕾', description: '中式风味的空气感甜点' },
  { id: 't12', name: '提拉米苏咖啡千层', description: '意式经典的咖啡风味' },
  { id: 't13', name: '南瓜肉桂司康', description: '秋日温暖的英式点心' },
  { id: 't14', name: '蓝莓柠檬磅蛋糕', description: '清新果香的扎实蛋糕' },
  { id: 't15', name: '花生酱果冻甜甜圈', description: '美式经典的童年味道' }
];

const RANDOM_NICKNAMES = [
  '甜蜜烘焙师', '奶油小方', '糖霜精灵', '麦香达人', '酥皮王子',
  '蛋糕诗人', '布丁小姐', '巧克力控', '芝士狂热者', '曲奇魔法师',
  '马卡龙匠', '慕斯仙子', '面包梦想家', '果酱小厨', '焦糖艺术家'
];

const getRandomNickname = (): string => {
  return RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];
};

const getRandomTheme = (): Theme => {
  return PRESET_THEMES[Math.floor(Math.random() * PRESET_THEMES.length)];
};

const App: React.FC = () => {
  const isMobile = useIsMobile();
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getRandomTheme());
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [submissions, setSubmissions] = useState<ChallengeCard[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (timeLeft <= 0 || isTimeUp) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isTimeUp]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleTimeout = useCallback(() => {
    setIsTimeUp(true);
    setTimeLeft(0);
  }, []);

  const handleSubmit = useCallback((data: {
    themeId: string;
    recipeName: string;
    ingredients: string[];
    description: string;
  }) => {
    const newCard: ChallengeCard = {
      id: uuidv4(),
      themeId: data.themeId,
      recipeName: data.recipeName,
      ingredients: data.ingredients,
      description: data.description,
      nickname: getRandomNickname(),
      likes: 0,
      likedByUser: false,
      comments: [],
      createdAt: Date.now()
    };
    setSubmissions((prev) => [newCard, ...prev]);
  }, []);

  const handleLike = useCallback((cardId: string) => {
    setSubmissions((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          if (!card.likedByUser) {
            setToast(`你为${card.recipeName}投了一票`);
          }
          return {
            ...card,
            likes: card.likedByUser ? card.likes : card.likes + 1,
            likedByUser: true
          };
        }
        return card;
      })
    );
  }, []);

  const handleAddComment = useCallback((cardId: string, content: string) => {
    const newComment: Comment = {
      id: uuidv4(),
      nickname: getRandomNickname(),
      content,
      createdAt: Date.now()
    };
    setSubmissions((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? { ...card, comments: [...card.comments, newComment] }
          : card
      )
    );
  }, []);

  const handleResetChallenge = useCallback(() => {
    setCurrentTheme(getRandomTheme());
    setTimeLeft(60);
    setIsTimeUp(false);
  }, []);

  const styles: Record<string, React.CSSProperties> = {
    app: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: isMobile ? 'auto' : '100%',
      minHeight: isMobile ? '100vh' : '100%',
      backgroundColor: '#faf0e6'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 60,
      padding: '0 16px',
      backgroundColor: '#4a3b32',
      color: '#faf0e6',
      flexShrink: 0
    },
    headerIcon: {
      width: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      backgroundColor: 'rgba(255,255,255,0.15)',
      fontSize: 16
    },
    headerTitle: {
      fontSize: isMobile ? 16 : 20,
      fontWeight: 600,
      letterSpacing: 1
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 16,
      padding: 16,
      overflow: isMobile ? 'visible' : 'hidden',
      minHeight: isMobile ? 0 : 0
    },
    leftPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      overflow: isMobile ? 'visible' : 'hidden',
      minHeight: 0,
      minWidth: 0
    },
    topSection: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 16,
      alignItems: isMobile ? 'stretch' : 'flex-start',
      flexShrink: 0
    },
    rankingWrapper: {
      width: isMobile ? '100%' : 240,
      flexShrink: 0
    },
    toast: {
      position: 'fixed',
      top: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(61, 90, 128, 0.95)',
      color: '#fff',
      padding: '10px 20px',
      borderRadius: 8,
      fontSize: 14,
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerIcon}>🧤</div>
        <h1 style={styles.headerTitle}>虚拟烘焙挑战赛</h1>
        <div style={styles.headerIcon}>🥣</div>
      </header>

      <main style={styles.main}>
        <div style={styles.leftPanel}>
          <div style={styles.topSection}>
            <ThemeCard
              theme={currentTheme}
              timeLeft={timeLeft}
              onTimeout={handleTimeout}
              isTimeUp={isTimeUp}
            />
            <SubmissionForm
              themeId={currentTheme.id}
              timeLeft={timeLeft}
              isLocked={isTimeUp}
              onSubmit={handleSubmit}
            />
          </div>
          <ChallengeBoard
            submissions={submissions}
            onLike={handleLike}
            onAddComment={handleAddComment}
            isMobile={isMobile}
          />
        </div>
        <div style={styles.rankingWrapper}>
          <RankingList submissions={submissions} isMobile={isMobile} />
        </div>
      </main>

      {toast && <div style={styles.toast}>{toast}</div>}

      {isTimeUp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              minWidth: 280
            }}
          >
            <h2 style={{ color: '#3d2c1a', marginBottom: 16, fontSize: 24 }}>⏰ 时间到！</h2>
            <p style={{ color: '#6b5b4e', marginBottom: 24 }}>提交入口已锁定，感谢参与本次挑战！</p>
            <button
              onClick={handleResetChallenge}
              style={{
                backgroundColor: '#3d5a80',
                color: '#fff',
                border: 'none',
                padding: '10px 28px',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(61,90,128,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.target as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              开始新挑战
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
