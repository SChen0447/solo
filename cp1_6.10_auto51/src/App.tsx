import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BrailleGrid from './components/BrailleGrid';
import BrailleCell, { playTone } from './components/BrailleCell';
import {
  DotPosition,
  getAlphabetLetters,
  getRandomLetter,
  isValidLetter,
  letterToDots,
} from './utils/brailleMap';

type LearningMode = 'browse' | 'practice' | 'test';

interface Star {
  id: number;
  x: number;
  y: number;
}

const MODE_LABELS: Record<LearningMode, string> = {
  browse: '浏览模式',
  practice: '练习模式',
  test: '测试模式',
};

const MAX_INPUT_LENGTH = 6;
const TEST_TIME_LIMIT = 10;

const App: React.FC = () => {
  const [mode, setMode] = useState<LearningMode>('browse');
  const [inputText, setInputText] = useState('');
  const [learnedLetters, setLearnedLetters] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [cellFeedback, setCellFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});
  const [practiceTarget, setPracticeTarget] = useState<string>('');
  const [testQuestion, setTestQuestion] = useState<{
    letter: string;
    options: string[];
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(TEST_TIME_LIMIT);
  const [stars, setStars] = useState<Star[]>([]);
  const [modeAnimationKey, setModeAnimationKey] = useState(0);
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const starIdRef = useRef(0);

  const alphabetLetters = useMemo(() => getAlphabetLetters(), []);

  const generateTestQuestion = useCallback(() => {
    const correctLetter = getRandomLetter();
    const options = new Set<string>([correctLetter]);
    while (options.size < 4) {
      options.add(getRandomLetter());
    }
    const shuffled = Array.from(options).sort(() => Math.random() - 0.5);
    setTestQuestion({ letter: correctLetter, options: shuffled });
    setTimeLeft(TEST_TIME_LIMIT);
  }, []);

  const generatePracticeTarget = useCallback(() => {
    setPracticeTarget(getRandomLetter());
    setPracticeFeedback(null);
    setCellFeedback({});
  }, []);

  useEffect(() => {
    if (mode === 'practice' && !practiceTarget) {
      generatePracticeTarget();
    }
  }, [mode, practiceTarget, generatePracticeTarget]);

  useEffect(() => {
    if (mode === 'test') {
      if (!testQuestion) {
        generateTestQuestion();
      }
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            generateTestQuestion();
            return TEST_TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTestQuestion(null);
    }
  }, [mode, testQuestion, generateTestQuestion]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    const filtered = value.split('').filter(c => isValidLetter(c)).join('').slice(0, MAX_INPUT_LENGTH);
    setInputText(filtered);
  }, []);

  const handleModeChange = useCallback((newMode: LearningMode) => {
    setMode(newMode);
    setModeAnimationKey(prev => prev + 1);
    setCellFeedback({});
    setPracticeFeedback(null);
    if (newMode === 'practice') {
      generatePracticeTarget();
    } else if (newMode === 'test') {
      generateTestQuestion();
    }
  }, [generatePracticeTarget, generateTestQuestion]);

  const addStar = useCallback(() => {
    const id = starIdRef.current++;
    const x = window.innerWidth - 80 + Math.random() * 40;
    const y = window.innerHeight - 80 + Math.random() * 40;
    setStars(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setStars(prev => prev.filter(s => s.id !== id));
    }, 1500);
  }, []);

  const handleCellClick = useCallback((letter: string, index: number) => {
    if (mode === 'practice') {
      if (letter === practiceTarget) {
        playTone(400, 0.2);
        setCellFeedback({ [index]: 'correct' });
        setPracticeFeedback('✓ 正确！');
        setLearnedLetters(prev => new Set(prev).add(letter));
        setTimeout(() => {
          generatePracticeTarget();
        }, 800);
      } else {
        playTone(150, 0.2);
        setCellFeedback({ [index]: 'wrong' });
        setPracticeFeedback(`✗ 错误！正确答案是 ${practiceTarget}`);
        setTimeout(() => {
          setCellFeedback({});
          setPracticeFeedback(null);
        }, 1000);
      }
    } else if (mode === 'test' && testQuestion) {
      if (letter === testQuestion.letter) {
        playTone(400, 0.2);
        setScore(prev => prev + 10);
        setLearnedLetters(prev => new Set(prev).add(letter));
        addStar();
        generateTestQuestion();
      } else {
        playTone(150, 0.2);
        generateTestQuestion();
      }
    }
  }, [mode, practiceTarget, testQuestion, generatePracticeTarget, generateTestQuestion, addStar]);

  const translatedBraille: JSX.Element[] = useMemo(() => {
    const chars = inputText.split('');
    return chars.map((char, idx) => (
      <BrailleCell
        key={idx}
        letter={char}
        activeDots={letterToDots(char)}
        showHint={false}
        size="small"
      />
    ));
  }, [inputText]);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#FFFFFF',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {mode === 'test' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.1)',
            zIndex: 100,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(timeLeft / TEST_TIME_LIMIT) * 100}%`,
              background: timeLeft <= 3
                ? 'linear-gradient(90deg, #e74c3c, #c0392b)'
                : 'linear-gradient(90deg, #FFBF00, #FF6347)',
              transition: 'width 1s linear, background 0.3s ease',
            }}
          />
        </div>
      )}

      <div
        style={{
          padding: '24px 5%',
          paddingTop: mode === 'test' ? 32 : 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          flex: 1,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1
            style={{
              fontSize: 'clamp(20px, 4vw, 28px)',
              fontWeight: 700,
              textAlign: 'center',
              color: '#FFBF00',
              marginBottom: 4,
            }}
          >
            盲文点字学习工具
          </h1>

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="输入英文字母 (A-Z)..."
              maxLength={MAX_INPUT_LENGTH}
              style={{
                flex: 1,
                minWidth: 200,
                maxWidth: 320,
                padding: '12px 16px',
                fontSize: 16,
                color: '#FFFFFF',
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '2px solid transparent',
                borderImage: 'linear-gradient(135deg, #FFBF00, #FF6347) 1',
                borderRadius: 8,
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
                backdropFilter: 'blur(10px)',
                transition: 'box-shadow 0.3s ease-out',
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 191, 0, 0.4)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div
              style={{
                display: 'flex',
                gap: 6,
                padding: 12,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                backdropFilter: 'blur(10px)',
                minHeight: 80,
                alignItems: 'center',
              }}
            >
              {translatedBraille.length > 0 ? (
                translatedBraille
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '0 12px' }}>
                  盲文翻译显示区
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 0,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 999,
              padding: 4,
              width: 'fit-content',
              margin: '0 auto',
              backdropFilter: 'blur(10px)',
            }}
          >
            {(['browse', 'practice', 'test'] as LearningMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                style={{
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: mode === m ? '#1a1a2e' : '#FFFFFF',
                  backgroundColor: mode === m ? '#FFBF00' : 'transparent',
                  border: 'none',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.3s ease-out',
                  animation: mode === m ? `modeSwitch 0.3s ease-out` : 'none',
                }}
                onMouseEnter={(e) => {
                  if (mode !== m) {
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 191, 0, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span key={modeAnimationKey}>{MODE_LABELS[m]}</span>
              </button>
            ))}
          </div>
        </div>

        {practiceFeedback && (
          <div
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              backgroundColor: practiceFeedback.includes('正确')
                ? 'rgba(46, 204, 113, 0.2)'
                : 'rgba(231, 76, 60, 0.2)',
              color: practiceFeedback.includes('正确') ? '#2ecc71' : '#e74c3c',
              fontSize: 18,
              fontWeight: 600,
              animation: 'fadeInUp 0.3s ease-out',
            }}
          >
            {practiceFeedback}
          </div>
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '20px 0',
          }}
        >
          <BrailleGrid
            mode={mode}
            inputText={inputText}
            onCellClick={handleCellClick}
            practiceTarget={practiceTarget}
            testQuestion={testQuestion}
            cellFeedback={cellFeedback}
          />
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: 800,
            padding: '16px 24px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 8,
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>当前模式:</span>
            <span
              key={modeAnimationKey}
              style={{
                color: '#FFBF00',
                fontWeight: 600,
                fontSize: 16,
                animation: 'modeSwitch 0.3s ease-out',
              }}
            >
              {MODE_LABELS[mode]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>已学习:</span>
            <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 16 }}>
              {learnedLetters.size} 个字母
            </span>
          </div>
          {mode === 'test' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>总积分:</span>
              <span style={{ color: '#FFBF00', fontWeight: 700, fontSize: 18 }}>
                ★ {score}
              </span>
            </div>
          )}
        </div>
      </div>

      {stars.map(star => (
        <div
          key={star.id}
          style={{
            position: 'fixed',
            left: star.x,
            top: star.y,
            fontSize: 32,
            color: '#FFBF00',
            pointerEvents: 'none',
            zIndex: 200,
            animation: 'starFly 1.5s ease-out forwards',
          }}
        >
          ★
        </div>
      ))}
    </div>
  );
};

export default App;
