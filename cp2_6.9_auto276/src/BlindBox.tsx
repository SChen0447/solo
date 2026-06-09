import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Book, saveFavorite } from './api';

interface BlindBoxProps {
  book: Book;
  onBack: () => void;
  sessionId: string;
}

const owlSvg = (
  <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="65" rx="38" ry="42" fill="#8D6E63" opacity="0.15"/>
    <ellipse cx="60" cy="68" rx="32" ry="36" fill="#A1887F" opacity="0.2"/>
    <path d="M28 42 L40 28 L52 44 Z" fill="#6D4C41" stroke="#5D4037" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M92 42 L80 28 L68 44 Z" fill="#6D4C41" stroke="#5D4037" strokeWidth="1.5" strokeLinejoin="round"/>
    <circle cx="45" cy="58" r="14" fill="#FFF8E7" stroke="#5D4037" strokeWidth="1.5"/>
    <circle cx="75" cy="58" r="14" fill="#FFF8E7" stroke="#5D4037" strokeWidth="1.5"/>
    <circle cx="45" cy="58" r="7" fill="#3E2723"/>
    <circle cx="75" cy="58" r="7" fill="#3E2723"/>
    <circle cx="48" cy="55" r="2.5" fill="#FFF8E7"/>
    <circle cx="78" cy="55" r="2.5" fill="#FFF8E7"/>
    <path d="M54 72 L60 80 L66 72 Z" fill="#FF8F00" stroke="#E65100" strokeWidth="1" strokeLinejoin="round"/>
    <path d="M38 86 Q45 95 52 86" stroke="#5D4037" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M68 86 Q75 95 82 86" stroke="#5D4037" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <ellipse cx="60" cy="102" rx="18" ry="5" fill="#5D4037" opacity="0.2"/>
  </svg>
);

const teapotSvg = (
  <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="100" rx="30" ry="6" fill="#5D4037" opacity="0.15"/>
    <path d="M35 55 Q20 58 20 72 Q20 86 35 90 L85 90 Q100 86 100 72 Q100 58 85 55 Z" fill="#8D6E63" opacity="0.15" stroke="#6D4C41" strokeWidth="2"/>
    <path d="M20 65 L8 58 L12 70 Z" fill="#A1887F" stroke="#6D4C41" strokeWidth="1.5" strokeLinejoin="round"/>
    <ellipse cx="60" cy="55" rx="30" ry="8" fill="#D7CCC8" stroke="#6D4C41" strokeWidth="1.5"/>
    <ellipse cx="60" cy="53" rx="22" ry="5" fill="#8D6E63" opacity="0.3"/>
    <rect x="55" y="35" width="10" height="20" rx="2" fill="#A1887F" stroke="#6D4C41" strokeWidth="1.5"/>
    <ellipse cx="60" cy="35" rx="10" ry="5" fill="#8D6E63" stroke="#6D4C41" strokeWidth="1.5"/>
    <path d="M100 65 Q115 62 112 50" stroke="#6D4C41" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M40 75 Q50 72 60 75 Q70 78 80 75" stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
    <circle cx="48" cy="70" r="2" fill="#5D4037" opacity="0.3"/>
    <circle cx="72" cy="70" r="2" fill="#5D4037" opacity="0.3"/>
    <path d="M58 30 Q56 20 60 15 Q64 20 62 30" stroke="#8D6E63" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6">
      <animate attributeName="d" values="M58 30 Q56 20 60 15 Q64 20 62 30;M58 30 Q54 18 60 12 Q66 18 62 30;M58 30 Q56 20 60 15 Q64 20 62 30" dur="3s" repeatCount="indefinite"/>
    </path>
    <path d="M63 28 Q66 20 70 18" stroke="#8D6E63" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5">
      <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2.5s" repeatCount="indefinite"/>
    </path>
  </svg>
);

const moonSvg = (
  <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="42" fill="#FFD54F" opacity="0.08"/>
    <circle cx="60" cy="60" r="34" fill="#FFE082" opacity="0.12"/>
    <path d="M78 35 Q52 38 45 60 Q40 82 60 92 Q38 88 32 65 Q28 42 55 30 Q68 26 78 35 Z" fill="#FFF9C4" stroke="#F9A825" strokeWidth="1.5"/>
    <circle cx="52" cy="55" r="5" fill="#FFE082" opacity="0.6"/>
    <circle cx="65" cy="72" r="3.5" fill="#FFE082" opacity="0.5"/>
    <circle cx="58" cy="78" r="2.5" fill="#FFE082" opacity="0.4"/>
    <circle cx="70" cy="50" r="2" fill="#FFE082" opacity="0.5"/>
    <ellipse cx="30" cy="25" rx="8" ry="4" fill="#FFF8E7" opacity="0.8">
      <animateTransform attributeName="transform" type="translate" values="0,0;3,-1;0,0" dur="4s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="35" cy="25" rx="5" ry="3" fill="#FFF8E7" opacity="0.9"/>
    <ellipse cx="95" cy="40" rx="6" ry="3" fill="#FFF8E7" opacity="0.7">
      <animateTransform attributeName="transform" type="translate" values="0,0;-2,1;0,0" dur="5s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="22" cy="80" rx="5" ry="2.5" fill="#FFF8E7" opacity="0.6">
      <animateTransform attributeName="transform" type="translate" values="0,0;2,-1;0,0" dur="3.5s" repeatCount="indefinite"/>
    </ellipse>
    <circle cx="20" cy="50" r="1.5" fill="#FFD54F" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="100" cy="75" r="1" fill="#FFD54F" opacity="0.7">
      <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="105" cy="25" r="1.2" fill="#FFD54F" opacity="0.6">
      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.8s" repeatCount="indefinite"/>
    </circle>
  </svg>
);

const illustrations = [owlSvg, teapotSvg, moonSvg];

const BlindBox: React.FC<BlindBoxProps> = ({ book, onBack, sessionId }) => {
  const [envelopeOpened, setEnvelopeOpened] = useState(false);
  const [showInnerPage, setShowInnerPage] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  const randomIllustration = illustrations[Math.floor(Math.random() * illustrations.length)];

  const triggerConfetti = useCallback(() => {
    const myConfetti = confetti.create(confettiCanvasRef.current || undefined, {
      resize: true,
      useWorker: true
    });

    const duration = 1500;
    const animationEnd = Date.now() + duration;
    const colors = ['#FF6B6B', '#FFD93D', '#6BCB77'];

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const frame = () => {
      myConfetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.5 },
        colors: colors
      });
      myConfetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.5 },
        colors: colors
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const handleEnvelopeClick = () => {
    if (envelopeOpened) return;
    setEnvelopeOpened(true);
    triggerConfetti();

    setTimeout(() => {
      setShowInnerPage(true);
    }, 800);
  };

  const handleFavorite = async () => {
    if (isFavorited) return;

    setShowHeartAnimation(true);

    try {
      await saveFavorite(sessionId, book);
      setIsFavorited(true);
    } catch (error) {
      console.error('收藏失败:', error);
    }

    setTimeout(() => {
      setShowHeartAnimation(false);
    }, 600);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (confettiCanvasRef.current) {
        confettiCanvasRef.current.remove();
      }
    };
  }, []);

  return (
    <div className="blindbox-page">
      <canvas ref={confettiCanvasRef} className="confetti-canvas" />

      <button className="back-btn" onClick={onBack}>
        ← 再选一本书
      </button>

      <div className="blindbox-content">
        {!envelopeOpened && (
          <div className="envelope-wrapper" onClick={handleEnvelopeClick}>
            <div className="envelope">
              <div className="envelope-body">
                <div className="envelope-flap envelope-flap-back"></div>
                <div className="envelope-front">
                  <div className="envelope-text">盲书奇遇</div>
                </div>
                <div className="envelope-flap">
                  <div className="wax-seal">
                    <div className="wax-highlight"></div>
                    <div className="wax-text">书</div>
                  </div>
                </div>
              </div>
            </div>
            <p className="envelope-hint">点击蜡封，开启你的盲书 ✨</p>
          </div>
        )}

        {envelopeOpened && (
          <div className={`inner-page-wrapper ${showInnerPage ? 'visible' : ''}`}>
            <div className="inner-page">
              <div className="page-crease top-left"></div>
              <div className="page-crease top-right"></div>
              <div className="page-crease bottom-left"></div>
              <div className="page-crease bottom-right"></div>

              <div className="page-content">
                <div className="page-left">
                  <div className="book-label">为你挑选的书</div>
                  <h2 className="book-title">{book.title}</h2>
                  <p className="book-author">— {book.author}</p>
                  <div className="book-tags">
                    <span className="book-tag">{book.genre}</span>
                    <span className="book-tag">{book.pages} 页</span>
                  </div>

                  <div className="handwritten-note">
                    <div className="note-quote">"</div>
                    <p className="note-text">{book.message}</p>
                    <div className="note-signature">— 盲书奇遇店主</div>
                  </div>
                </div>

                <div className="page-right">
                  <div className="illustration-frame">
                    {randomIllustration}
                  </div>
                  <div className="frame-caption">手绘小画</div>
                </div>
              </div>

              <div className="action-buttons">
                <button
                  className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
                  onClick={handleFavorite}
                  disabled={isFavorited}
                >
                  {showHeartAnimation || isFavorited ? (
                    <span className={`heart-icon ${showHeartAnimation ? 'beating' : ''}`}>❤️</span>
                  ) : (
                    '收藏到心墙'
                  )}
                </button>

                <button className="share-btn" onClick={handleShare}>
                  分享
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showToast && (
        <div className="toast">
          ✅ 链接已复制到剪贴板
        </div>
      )}
    </div>
  );
};

export default BlindBox;
