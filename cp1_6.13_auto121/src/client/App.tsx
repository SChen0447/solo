import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { FragmentData, BambooData, SlotData } from '../../types/scroll';
import { decodeFragment, fetchFragments } from './utils/api';
import Fragment from './components/Fragment';
import Scroll from './components/Scroll';
import './App.scss';

const TOTAL_CHARACTERS = 15;
const BAMBOO_COUNT = 15;

const gameCharacters = [
  { char: '天', meaning: '《尚书·尧典》：乃命羲和，钦若昊天，历象日月星辰，敬授人时。' },
  { char: '地', meaning: '《周易·坤卦》：地势坤，君子以厚德载物。' },
  { char: '玄', meaning: '《道德经·第一章》：玄之又玄，众妙之门。' },
  { char: '黄', meaning: '《千字文》：天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。' },
  { char: '宇', meaning: '《庄子·庚桑楚》：有实而无乎处者，宇也；有长而无本剽者，宙也。' },
  { char: '宙', meaning: '《淮南子·齐俗训》：往古来今谓之宙，四方上下谓之宇。' },
  { char: '洪', meaning: '《尚书·洪范》：洪水滔天，浩浩怀山襄陵，下民其咨。' },
  { char: '荒', meaning: '《诗经·小雅》：天作高山，大王荒之。彼作矣，文王康之。' },
  { char: '日', meaning: '《山海经·大荒东经》：汤谷上有扶桑，十日所浴，在黑齿北。' },
  { char: '月', meaning: '《楚辞·天问》：夜光何德，死则又育？厥利维何，而顾菟在腹？' },
  { char: '盈', meaning: '《周易·丰卦》：日中则昃，月盈则食，天地盈虚，与时消息。' },
  { char: '昃', meaning: '《尚书·无逸》：文王卑服，即康功田功。徽柔懿恭，怀保小民，惠鲜鳏寡。自朝至于日中昃，不遑暇食。' },
  { char: '辰', meaning: '《左传·昭公七年》：日月之会是谓辰，故以配日。' },
  { char: '宿', meaning: '《周礼·春官》：二十有八星之位，辨其叙事，以会天位。' },
  { char: '列', meaning: '《荀子·天论》：列星随旋，日月递炤，四时代御，阴阳大化。' }
];

const clipPaths = [
  'polygon(20% 0%, 80% 5%, 100% 40%, 95% 85%, 60% 100%, 15% 95%, 0% 50%, 5% 15%)',
  'polygon(10% 10%, 75% 0%, 100% 50%, 85% 100%, 25% 95%, 0% 60%, 5% 25%)',
  'polygon(30% 5%, 90% 15%, 100% 70%, 70% 100%, 10% 85%, 0% 35%, 20% 10%)',
  'polygon(15% 0%, 85% 10%, 95% 65%, 75% 100%, 20% 90%, 0% 55%, 10% 20%)',
  'polygon(25% 5%, 80% 0%, 100% 45%, 90% 90%, 50% 100%, 5% 80%, 0% 30%)',
  'polygon(5% 15%, 70% 0%, 100% 55%, 80% 100%, 30% 95%, 0% 65%, 10% 35%)',
  'polygon(18% 3%, 88% 8%, 98% 55%, 78% 98%, 22% 92%, 3% 45%, 12% 22%)',
  'polygon(22% 2%, 92% 12%, 100% 60%, 72% 96%, 18% 88%, 2% 50%, 8% 28%)'
];

const generateStrokes = (charIndex: number): number[][][] => {
  const variants = [
    [[[10, 20], [30, 20]], [[20, 10], [20, 35]], [[8, 28], [32, 28]], [[14, 36], [26, 36]]],
    [[[5, 18], [25, 12]], [[15, 8], [18, 35]], [[12, 30], [30, 32]]],
    [[[8, 15], [32, 18]], [[22, 10], [20, 38]], [[6, 32], [28, 30]]],
    [[[12, 22], [28, 16]], [[16, 6], [24, 34]], [[10, 36], [30, 28]]],
    [[[10, 12], [30, 28]], [[20, 8], [22, 36]], [[12, 30], [28, 30]]]
  ];
  return variants[charIndex % variants.length];
};

const generateInitialFragments = (): FragmentData[] => {
  const fragments: FragmentData[] = [];
  const positions = Array.from({ length: TOTAL_CHARACTERS }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (let i = 0; i < 30; i++) {
    const isTarget = i < TOTAL_CHARACTERS;
    const posIdx = isTarget ? positions[i] : Math.floor(Math.random() * TOTAL_CHARACTERS);
    fragments.push({
      id: `frag-${i}`,
      character: gameCharacters[posIdx].char,
      positionIndex: isTarget ? posIdx : -1,
      clipPath: clipPaths[i % clipPaths.length],
      rotation: (Math.random() - 0.5) * 40,
      strokes: generateStrokes(i)
    });
  }

  for (let i = fragments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fragments[i], fragments[j]] = [fragments[j], fragments[i]];
  }

  return fragments;
};

const generateInitialBamboos = (): BambooData[] => {
  const bamboos: BambooData[] = [];
  for (let i = 0; i < BAMBOO_COUNT; i++) {
    const slot: SlotData = {
      index: i,
      bambooIndex: i,
      character: gameCharacters[i].char,
      meaning: gameCharacters[i].meaning,
      isFilled: false,
      isWrong: false
    };
    bamboos.push({
      index: i,
      slots: [slot],
      isGlowing: false
    });
  }
  return bamboos;
};

const playWrongSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.log('Audio not available');
  }
};

const App: React.FC = () => {
  const [fragments, setFragments] = useState<FragmentData[]>([]);
  const [bamboos, setBamboos] = useState<BambooData[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeMeaning, setActiveMeaning] = useState<{
    bambooIndex: number;
    slotIndex: number;
    text: string;
  } | null>(null);
  const [wrongSlot, setWrongSlot] = useState<{ bambooIndex: number; slotIndex: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validatingSlots, setValidatingSlots] = useState<Set<number>>(new Set());
  const meaningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const init = async () => {
      const fetchedFragments = await fetchFragments();
      if (fetchedFragments.length > 0) {
        setFragments(fetchedFragments);
      } else {
        setFragments(generateInitialFragments());
      }
      setBamboos(generateInitialBamboos());
      setTimeout(() => setIsLoading(false), 300);
    };
    init();
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, fragment: FragmentData) => {
    e.dataTransfer.setData('fragmentId', fragment.id);
    e.dataTransfer.setData('fragmentData', JSON.stringify(fragment));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(fragment.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleSlotDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSlotDrop = useCallback(async (slotIndex: number, fragment: FragmentData) => {
    if (validatingSlots.has(slotIndex)) return;

    const bamboo = bamboos[slotIndex];
    if (!bamboo || bamboo.slots[0].isFilled) return;

    setValidatingSlots(prev => new Set(prev).add(slotIndex));

    const result = await decodeFragment(fragment.id, slotIndex);
    setDraggingId(null);

    if (result.matched && result.character && result.meaning) {
      setBamboos(prev => {
        const newBamboos = [...prev];
        newBamboos[slotIndex] = {
          ...newBamboos[slotIndex],
          isGlowing: true,
          slots: newBamboos[slotIndex].slots.map(slot =>
            slot.index === slotIndex
              ? { ...slot, isFilled: true, fragmentId: fragment.id }
              : slot
          )
        };
        return newBamboos;
      });

      setFragments(prev => prev.filter(f => f.id !== fragment.id));

      setCompletedCount(prev => {
        const newCount = prev + 1;
        if (newCount >= TOTAL_CHARACTERS) {
          setTimeout(() => setIsCompleted(true), 100);
        }
        return newCount;
      });

      const bambooIdx = slotIndex;
      setActiveMeaning({
        bambooIndex: bambooIdx,
        slotIndex: slotIndex,
        text: result.meaning
      });

      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
      }
      meaningTimeoutRef.current = setTimeout(() => {
        setActiveMeaning(null);
      }, 5000);

      setTimeout(() => {
        setBamboos(prev => {
          const newBamboos = [...prev];
          if (newBamboos[slotIndex]) {
            newBamboos[slotIndex] = {
              ...newBamboos[slotIndex],
              isGlowing: false
            };
          }
          return newBamboos;
        });
      }, 2000);

    } else {
      const bambooIdx = slotIndex;
      setWrongSlot({ bambooIndex: bambooIdx, slotIndex });
      playWrongSound();

      setTimeout(() => {
        setWrongSlot(null);
      }, 300);
    }

    setValidatingSlots(prev => {
      const next = new Set(prev);
      next.delete(slotIndex);
      return next;
    });
  }, [bamboos, validatingSlots]);

  if (isLoading) {
    return (
      <div className="app app--loading">
        <div className="loading-indicator">
          <div className="loading-bamboo"></div>
          <span className="loading-text">载入典籍...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app" onDragEnd={handleDragEnd}>
      <header className="app__header">
        <h1 className="app__title">尘封·书简解密</h1>
        <div className="app__progress">
          <div className="progress-bar">
            {bamboos.map((_, idx) => (
              <div
                key={idx}
                className={`progress-bar__segment ${idx < completedCount ? 'progress-bar__segment--filled' : ''}`}
              />
            ))}
          </div>
          <span className="progress-bar__count">{completedCount}/{TOTAL_CHARACTERS}</span>
        </div>
      </header>

      <main className="app__main">
        <section className="app__fragments-area">
          <div className="fragments-header">
            <h2 className="fragments-header__title">碎片库</h2>
            <span className="fragments-header__count">剩余 {fragments.length} 片</span>
          </div>
          <div className="fragments-grid">
            {fragments.map(fragment => (
              <Fragment
                key={fragment.id}
                fragment={fragment}
                onDragStart={handleDragStart}
                isDragging={draggingId === fragment.id}
                size={typeof window !== 'undefined' && window.innerWidth < 768 ? 30 : 40}
              />
            ))}
          </div>
          {fragments.length === 0 && !isCompleted && (
            <div className="fragments-empty">已无可用碎片，请验证拼合位置</div>
          )}
        </section>

        <section className="app__scroll-area">
          <div className="scroll-header">
            <h2 className="scroll-header__title">书简区</h2>
            <span className="scroll-header__hint">将碎片拖入虚线框中</span>
          </div>
          <Scroll
            bamboos={bamboos}
            isUnrolled={isCompleted}
            activeMeaning={activeMeaning}
            wrongSlot={wrongSlot}
            onSlotDrop={handleSlotDrop}
            onSlotDragOver={handleSlotDragOver}
          />
        </section>
      </main>

      {isCompleted && (
        <div className="app__overlay"></div>
      )}
    </div>
  );
};

const RootApp: React.FC = () => (
  <HashRouter>
    <App />
  </HashRouter>
);

export default RootApp;
