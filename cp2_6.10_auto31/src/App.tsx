import { useReducer, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { Album, AppAction } from './types';
import { saveAlbums, loadAlbums } from './utils/storage';
import Home from './pages/Home';

const AlbumDetail = lazy(() => import('./pages/AlbumDetail'));
const Admin = lazy(() => import('./pages/Admin'));

const initialAlbums: Album[] = [
  {
    id: 'album-1',
    title: '星河漫游',
    artist: '林夕',
    coverGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    coverEmoji: '🌌',
    description: '一张关于宇宙、梦境与孤独的电子氛围专辑。10首原创曲目，带你穿越无尽星河。',
    goalAmount: 50000,
    pledgedAmount: 17500,
    tiers: [
      { id: 'tier-1-1', price: 30, reward: '数字版专辑', remaining: 5 },
      { id: 'tier-1-2', price: 80, reward: '限量签名版', remaining: 5 },
      { id: 'tier-1-3', price: 150, reward: '典藏黑胶版', remaining: 5 }
    ],
    unlockedContent: [
      { id: 'uc-1-1', threshold: 25, title: '首支单曲试听', description: '主打歌「星河漫游」30秒抢先试听片段', type: 'audio', isUnlocked: true },
      { id: 'uc-1-2', threshold: 50, title: '幕后创作花絮', description: '专辑封面拍摄与混音室录制独家视频', type: 'video', isUnlocked: false },
      { id: 'uc-1-3', threshold: 75, title: '手写歌词本扫描', description: '创作期间的手写笔记与歌词灵感', type: 'behind', isUnlocked: false },
      { id: 'uc-1-4', threshold: 100, title: '隐藏曲目揭秘', description: '专辑附赠的神秘Bonus Track完整公开', type: 'audio', isUnlocked: false }
    ],
    votes: [
      {
        id: 'vote-1',
        question: '下一首单曲风格？',
        options: [
          { id: 'opt-1-1', label: 'A. 电子合成器', votes: 23, color: '#7c5cfc' },
          { id: 'opt-1-2', label: 'B. 原声吉他', votes: 18, color: '#4ecdc4' },
          { id: 'opt-1-3', label: 'C. 实验噪音', votes: 9, color: '#ff6b6b' }
        ],
        totalVotes: 50,
        hasVoted: false
      }
    ]
  },
  {
    id: 'album-2',
    title: '城市夜曲',
    artist: '周野',
    coverGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #ff6b6b 100%)',
    coverEmoji: '🌃',
    description: '都市民谣专辑，记录城市中那些清醒的夜晚和迷路的灵魂。',
    goalAmount: 30000,
    pledgedAmount: 22500,
    tiers: [
      { id: 'tier-2-1', price: 30, reward: '数字版专辑', remaining: 5 },
      { id: 'tier-2-2', price: 80, reward: '限量签名版', remaining: 5 },
      { id: 'tier-2-3', price: 150, reward: '典藏黑胶版', remaining: 5 }
    ],
    unlockedContent: [
      { id: 'uc-2-1', threshold: 25, title: '首支单曲试听', description: '「凌晨三点」Demo版本试听', type: 'audio', isUnlocked: true },
      { id: 'uc-2-2', threshold: 50, title: 'Live演出录像', description: '小型Livehouse独家演出片段', type: 'video', isUnlocked: true },
      { id: 'uc-2-3', threshold: 75, title: '巡演日记', description: '全国巡演期间的照片与文字记录', type: 'behind', isUnlocked: false },
      { id: 'uc-2-4', threshold: 100, title: '不插电版本', description: '全专辑不插电重新编曲版本', type: 'audio', isUnlocked: false }
    ],
    votes: [
      {
        id: 'vote-2',
        question: '巡演优先去哪个城市？',
        options: [
          { id: 'opt-2-1', label: 'A. 北京', votes: 34, color: '#ff6b6b' },
          { id: 'opt-2-2', label: 'B. 上海', votes: 45, color: '#7c5cfc' },
          { id: 'opt-2-3', label: 'C. 成都', votes: 28, color: '#4ecdc4' },
          { id: 'opt-2-4', label: 'D. 广州', votes: 19, color: '#ffd93d' }
        ],
        totalVotes: 126,
        hasVoted: false
      }
    ]
  },
  {
    id: 'album-3',
    title: '森呼吸',
    artist: '白水',
    coverGradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 50%, #093028 100%)',
    coverEmoji: '🌿',
    description: '新世纪自然音乐专辑，融合森林实地录音与东方传统乐器。',
    goalAmount: 80000,
    pledgedAmount: 8000,
    tiers: [
      { id: 'tier-3-1', price: 30, reward: '数字版专辑', remaining: 5 },
      { id: 'tier-3-2', price: 80, reward: '限量签名版', remaining: 5 },
      { id: 'tier-3-3', price: 150, reward: '典藏黑胶版', remaining: 5 }
    ],
    unlockedContent: [
      { id: 'uc-3-1', threshold: 25, title: '森林采样试听', description: '在云南原始森林录制的环境音精选', type: 'audio', isUnlocked: false },
      { id: 'uc-3-2', threshold: 50, title: '古琴弹奏教学', description: '专辑中古琴段落的详细教学视频', type: 'video', isUnlocked: false },
      { id: 'uc-3-3', threshold: 75, title: '录音笔记', description: '每首曲目的创作思路与技术笔记', type: 'behind', isUnlocked: false },
      { id: 'uc-3-4', threshold: 100, title: '杜比全景声版本', description: '沉浸式全景声特别混音版本', type: 'audio', isUnlocked: false }
    ],
    votes: [
      {
        id: 'vote-3',
        question: '专辑额外加入哪种乐器？',
        options: [
          { id: 'opt-3-1', label: 'A. 古筝', votes: 15, color: '#4ecdc4' },
          { id: 'opt-3-2', label: 'B. 笛箫', votes: 22, color: '#7c5cfc' },
          { id: 'opt-3-3', label: 'C. 手碟', votes: 12, color: '#ff6b6b' }
        ],
        totalVotes: 49,
        hasVoted: false
      }
    ]
  }
];

function appReducer(state: Album[], action: AppAction): Album[] {
  switch (action.type) {
    case 'SYNC_STATE':
      return action.albums;

    case 'PURCHASE_TIER': {
      const newState = state.map(album => {
        if (album.id !== action.albumId) return album;
        const tier = album.tiers.find(t => t.id === action.tierId);
        if (!tier || tier.remaining <= 0) return album;

        const newPledged = album.pledgedAmount + tier.price;
        const newTiers = album.tiers.map(t =>
          t.id === action.tierId ? { ...t, remaining: t.remaining - 1 } : t
        );
        const newUnlocked = album.unlockedContent.map(content => {
          const percentage = (newPledged / album.goalAmount) * 100;
          return percentage >= content.threshold
            ? { ...content, isUnlocked: true }
            : content;
        });
        return {
          ...album,
          pledgedAmount: newPledged,
          tiers: newTiers,
          unlockedContent: newUnlocked
        };
      });
      saveAlbums(newState);
      return newState;
    }

    case 'CAST_VOTE': {
      const newState = state.map(album => {
        if (album.id !== action.albumId) return album;
        const newVotes = album.votes.map(vote => {
          if (vote.id !== action.voteId || vote.hasVoted) return vote;
          const newOptions = vote.options.map(opt =>
            opt.id === action.optionId ? { ...opt, votes: opt.votes + 1 } : opt
          );
          return {
            ...vote,
            options: newOptions,
            totalVotes: vote.totalVotes + 1,
            hasVoted: true
          };
        });
        return { ...album, votes: newVotes };
      });
      saveAlbums(newState);
      return newState;
    }

    default:
      return state;
  }
}

export default function App() {
  const [albums, dispatch] = useReducer(appReducer, initialAlbums, (init) => {
    const stored = loadAlbums();
    if (stored && stored.length > 0) return stored;
    saveAlbums(init);
    return init;
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'soundwave_albums' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Album[];
          dispatch({ type: 'SYNC_STATE', albums: parsed });
        } catch {
          console.error('Failed to parse synced albums');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={
        <div style={{
          minHeight: '100vh',
          background: '#0b0e1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(124, 92, 252, 0.2)',
              borderTopColor: '#7c5cfc',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>加载中...</p>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Home albums={albums} />} />
          <Route path="/album/:id" element={<AlbumDetail albums={albums} dispatch={dispatch} />} />
          <Route path="/admin" element={<Admin albums={albums} dispatch={dispatch} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
