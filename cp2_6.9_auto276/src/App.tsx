import React, { useState, useEffect, useCallback } from 'react';
import BlindBox from './BlindBox';
import { Book, QuestionnaireAnswers, recommendBook } from './api';

type AppView = 'questionnaire' | 'loading' | 'blindbox';

const questions = [
  {
    key: 'tearfulBook',
    title: '最近让你流泪的书是？',
    options: [
      { value: '治愈', label: '一本温暖治愈的小书' },
      { value: '深情', label: '一段刻骨铭心的爱情' },
      { value: '人生', label: '一个关于活着的故事' }
    ]
  },
  {
    key: 'readingSpeed',
    title: '喜欢快速翻页还是慢嚼细咽？',
    options: [
      { value: 'fast', label: '一口气读到结尾' },
      { value: 'slow', label: '慢慢品味每一句话' },
      { value: 'random', label: '随手翻到哪就读哪' }
    ]
  },
  {
    key: 'pagePreference',
    title: '希望书轻于200页还是重于400页？',
    options: [
      { value: 'light', label: '轻薄便携，随时翻阅' },
      { value: 'medium', label: '厚薄适中，刚刚好' },
      { value: 'heavy', label: '厚重扎实，沉浸其中' }
    ]
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('questionnaire');
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>({});
  const [recommendedBook, setRecommendedBook] = useState<Book | null>(null);
  const [shakeForm, setShakeForm] = useState(false);

  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('blindBookSessionId');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('blindBookSessionId', sessionId);
    }
    return sessionId;
  }, []);

  useEffect(() => {
    getSessionId();
  }, [getSessionId]);

  const handleOptionSelect = (questionKey: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionKey]: value }));
  };

  const allAnswered = questions.every(q => answers[q.key as keyof QuestionnaireAnswers]);

  const handleSubmit = async () => {
    if (!allAnswered) {
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 300);
      return;
    }

    setView('loading');

    try {
      const book = await recommendBook(answers as QuestionnaireAnswers);
      setRecommendedBook(book);
      setTimeout(() => {
        setView('blindbox');
      }, 600);
    } catch (error) {
      console.error('推荐失败:', error);
      setView('questionnaire');
    }
  };

  const handleReset = () => {
    setAnswers({});
    setRecommendedBook(null);
    setView('questionnaire');
  };

  if (view === 'blindbox' && recommendedBook) {
    return (
      <div className="app-container">
        <BlindBox book={recommendedBook} onBack={handleReset} sessionId={getSessionId()} />
      </div>
    );
  }

  if (view === 'loading') {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="lamp-loader">
            <svg viewBox="0 0 80 100" width="80" height="100" className="lamp-svg">
              <defs>
                <radialGradient id="lampGlow" cx="50%" cy="30%" r="50%">
                  <stop offset="0%" stopColor="#FFD700" stopOpacity="1">
                    <animate attributeName="stopOpacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="50%" stopColor="#FFA500" stopOpacity="0.6">
                    <animate attributeName="stopOpacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="40" cy="30" r="35" fill="url(#lampGlow)" className="lamp-light" />
              <path d="M20 55 L60 55 L55 70 L25 70 Z" fill="#8B5E3C" rx="3" />
              <rect x="30" y="70" width="20" height="8" fill="#6B4423" rx="2" />
              <rect x="35" y="78" width="10" height="15" fill="#5B3A6B" rx="2" />
              <ellipse cx="40" cy="95" rx="15" ry="4" fill="#8D6E63" opacity="0.5" />
            </svg>
          </div>
          <p className="loading-text-main">店主正在为你挑书...</p>
          <p className="loading-text-sub">每本书都在等待与你相遇</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className={`questionnaire-page ${shakeForm ? 'shake' : ''}`}>
        <header className="questionnaire-header">
          <h1 className="app-title">盲书奇遇</h1>
          <p className="app-subtitle">回答三个问题，遇见一本未知的好书</p>
        </header>

        <div className="questions-container">
          {questions.map((question, index) => (
            <div key={question.key} className="question-card">
              <div className="question-number">问题 {index + 1}</div>
              <h2 className="question-title">{question.title}</h2>
              <div className="options-group">
                {question.options.map(option => (
                  <button
                    key={option.value}
                    className={`option-btn ${answers[question.key as keyof QuestionnaireAnswers] === option.value ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(question.key, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="submit-section">
          <button
            className={`submit-btn ${allAnswered ? 'active' : ''}`}
            onClick={handleSubmit}
          >
            {allAnswered ? '开启我的盲书奇遇 ✨' : '请先回答所有问题'}
          </button>
          {!allAnswered && (
            <p className="hint-text">还有 {questions.filter(q => !answers[q.key as keyof QuestionnaireAnswers]).length} 个问题等待回答</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
