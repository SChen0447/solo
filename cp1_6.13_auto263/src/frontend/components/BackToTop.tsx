import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <button
        className={`back-to-top ${visible ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="回到顶部"
      >
        <ArrowUp size={20} color="white" />
      </button>
      <style>{`
        .back-to-top {
          position: fixed;
          bottom: 32px;
          right: 32px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--color-bronze);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(20px);
          pointer-events: none;
          transition: var(--transition-base);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          z-index: 90;
        }

        .back-to-top.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .back-to-top:hover {
          background: var(--color-bronze-dark);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
        }

        @media (max-width: 768px) {
          .back-to-top {
            bottom: 80px;
            right: 20px;
          }
        }
      `}</style>
    </>
  );
}
