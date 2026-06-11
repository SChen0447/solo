import { useState, useEffect, useCallback } from 'react';
import SeaScene from './SeaScene';
import BottleEditor from './BottleEditor';
import {
  Bottle,
  Blessing,
  BottleColor,
} from './interface';

type View = 'home' | 'editor' | 'ocean';

const generateSampleBottles = (userId: string): Bottle[] => {
  const colors: BottleColor[] = ['pink', 'blue', 'green', 'yellow', 'purple', 'orange'];
  const sampleTitles = [
    '写给未来的自己',
    '海边的那个夏天',
    '给亲爱的你',
    '十年后的约定',
    '藏在心底的秘密',
    '生日快乐',
    '不要忘记这一刻',
    '星光下的许愿',
    '雨后天晴',
    '初见你的那天',
    '梦想的彼岸',
    '温暖的回忆',
    '那年的风',
    '永恒的瞬间',
    '希望的种子',
    '午夜的悄悄话',
    '远方的思念',
    '春天的约定',
    '勇敢的心',
    '最后的一封信',
    '未完成的诗',
    '时间的礼物',
    '漂流的思念',
    '昨日重现',
    '明天会更好',
  ];

  const sampleContents = [
    '亲爱的未来的我：\n\n当你看到这封信的时候，不知道你是否还记得写下这些文字时的心情。那时候的我，正站在人生的十字路口，对未来充满期待，也有些许迷茫。但我想告诉你，无论发生什么，请记得此刻的你心中那份对生活的热爱和对美好的向往。',
    '那片海，那个夏天，那些人，那些事。\n\n阳光洒在金色的沙滩上，海风轻轻吹过，带着咸咸的味道。我们并肩坐在礁石上，看着远处的帆影，谈着各自的梦想。那一刻，时间仿佛静止了。',
    '有些话，当面说不出口。\n\n只能写在这张纸上，让它随着海水漂流。也许有一天，它会漂到你的身边，让你知道，在某个遥远的地方，有一个人，一直想着你。',
    '十年，说长不长，说短不短。\n\n不知道十年后的我们会是什么样子？是否还在追逐同一个梦想？是否还记得今天的约定？无论如何，请记得，你永远是我生命中最重要的人。',
    '每个人心中都有一个秘密花园。\n\n那里种着我们不愿与人分享的回忆和情感。今天，我把它封存在这个时空胶囊里，等待未来的某一天，重新开启。',
  ];

  return Array.from({ length: 25 }).map((_, i) => {
    const now = Date.now();
    const isUnlocked = i % 3 === 0;
    const openAt = isUnlocked
      ? now - Math.random() * 30 * 24 * 60 * 60 * 1000
      : now + (1 + Math.random() * 365) * 24 * 60 * 60 * 1000;

    return {
      id: `sample-${i}-${Math.random().toString(36).substring(2, 9)}`,
      title: sampleTitles[i % sampleTitles.length],
      content: sampleContents[i % sampleContents.length],
      fontFamily: i % 2 === 0 ? 'default' : 'handwriting',
      media: [],
      openAt,
      createdAt: now - Math.random() * 60 * 24 * 60 * 60 * 1000,
      creatorId: i % 7 === 0 ? userId : `user-${i % 5}`,
      color: colors[i % colors.length],
      blessings: Array.from({ length: Math.floor(Math.random() * 3) }).map((_, j) => ({
        id: `blessing-${i}-${j}`,
        content: [
          '愿你被世界温柔以待',
          '一切都是最好的安排',
          '时光不老，我们不散',
        ][j % 3],
        createdAt: now - Math.random() * 7 * 24 * 60 * 60 * 1000,
        template: (['letter', 'leaf', 'feather', 'origami'] as const)[j % 4],
      })),
      position: {
        x: 5 + Math.random() * 90,
        y: 5 + Math.random() * 80,
        speed: 0.3 + Math.random() * 0.5,
        direction: Math.random() > 0.5 ? 1 : -1,
        size: 50 + Math.random() * 30,
      },
    };
  });
};

const getUserId = (): string => {
  let userId = localStorage.getItem('time_capsule_user');
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('time_capsule_user', userId);
  }
  return userId;
};

export default function App() {
  const [view, setView] = useState<View>('home');
  const [currentUserId] = useState<string>(() => getUserId());
  const [bottles, setBottles] = useState<Bottle[]>(() => generateSampleBottles(getUserId()));
  const [showThrowAnimation, setShowThrowAnimation] = useState(false);

  useEffect(() => {
    try {
      const savedBottles = localStorage.getItem('time_capsule_bottles');
      if (savedBottles) {
        const parsed = JSON.parse(savedBottles);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBottles(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('time_capsule_bottles', JSON.stringify(bottles));
    } catch {
      // ignore storage errors
    }
  }, [bottles]);

  const handleCreateBottle = useCallback(() => {
    setView('editor');
  }, []);

  const handleSubmitBottle = useCallback((bottle: Bottle) => {
    setShowThrowAnimation(true);
    setTimeout(() => {
      setBottles((prev) => [bottle, ...prev]);
    }, 1000);
  }, []);

  const handleThrowAnimationComplete = useCallback(() => {
    setShowThrowAnimation(false);
    setView('ocean');
  }, []);

  const handleCancelEditor = useCallback(() => {
    setView('home');
  }, []);

  const handleAddBlessing = useCallback(
    (_bottleId: string, _blessing: Blessing) => {
      // Blessing is already updated in SeaScene via setBottles callback
    },
    []
  );

  const navigateToOcean = useCallback(() => {
    setView('ocean');
  }, []);

  useEffect(() => {
    if (view === 'home') {
      const timer = setTimeout(() => {
        // Auto-navigation hint after delay on home page
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  return (
    <div className="app-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {view !== 'editor' && (
        <>
          {view === 'ocean' && (
            <button
              onClick={() => setView('home')}
              style={{
                position: 'fixed',
                top: 20,
                left: 20,
                zIndex: 50,
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 25,
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                fontSize: 14,
              }}
            >
              🏠 主页
            </button>
          )}
          {view === 'home' && (
            <button
              onClick={navigateToOcean}
              style={{
                position: 'fixed',
                top: 20,
                right: 20,
                zIndex: 50,
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 25,
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                fontSize: 14,
              }}
            >
              🌊 前往时光海
            </button>
          )}
          <SeaScene
            mode={view === 'home' ? 'home' : 'ocean'}
            bottles={bottles}
            currentUserId={currentUserId}
            onCreateBottle={handleCreateBottle}
            onThrowAnimationComplete={handleThrowAnimationComplete}
            showThrowAnimation={showThrowAnimation}
            onAddBlessing={handleAddBlessing}
            setBottles={setBottles}
          />
        </>
      )}

      {view === 'editor' && (
        <BottleEditor
          currentUserId={currentUserId}
          onSubmit={handleSubmitBottle}
          onCancel={handleCancelEditor}
        />
      )}
    </div>
  );
}
