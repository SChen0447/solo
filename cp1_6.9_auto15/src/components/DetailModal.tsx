import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { BioData, habitatColors } from '../data/bioData';

interface DetailModalProps {
  bio: BioData;
  onClose: () => void;
}

export const DetailModal = ({ bio, onClose }: DetailModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLSpanElement>(null);
  const frameIndex = useRef(0);

  useEffect(() => {
    if (overlayRef.current && contentRef.current) {
      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      });

      gsap.fromTo(
        contentRef.current,
        { y: 200, opacity: 0, rotation: -180, scale: 0.5 },
        {
          y: 0,
          opacity: 1,
          rotation: 0,
          scale: 1,
          duration: 0.8,
          ease: 'back.out(1.5)',
          delay: 0.1
        }
      );
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (emojiRef.current) {
        frameIndex.current = (frameIndex.current + 1) % bio.frames.length;
        gsap.to(emojiRef.current, {
          opacity: 0,
          duration: 0.15,
          onComplete: () => {
            if (emojiRef.current) {
              emojiRef.current.textContent = bio.frames[frameIndex.current];
              gsap.to(emojiRef.current, { opacity: 1, duration: 0.15 });
            }
          }
        });
      }
    }, 600);
    return () => clearInterval(interval);
  }, [bio.frames]);

  const closeModal = () => {
    if (overlayRef.current && contentRef.current) {
      gsap.to(contentRef.current, {
        y: 100,
        opacity: 0,
        scale: 0.8,
        rotation: 180,
        duration: 0.4,
        ease: 'power2.in'
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.4,
        delay: 0.1,
        onComplete: onClose
      });
    } else {
      onClose();
    }
  };

  const [minDepth, maxDepth] = bio.depthRange;
  const totalDepth = 10000;
  const leftPercent = (minDepth / totalDepth) * 100;
  const widthPercent = Math.max(3, ((maxDepth - minDepth) / totalDepth) * 100);

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) closeModal();
      }}
    >
      <div ref={contentRef} className="modal-content">
        <button className="modal-close" onClick={closeModal}>
          ✕
        </button>

        <div className="modal-body">
          <div
            className="modal-hero"
            style={{ background: bio.color }}
          >
            <span ref={emojiRef} className="modal-emoji">
              {bio.frames[0]}
            </span>
            <span
              className="modal-habitat-badge"
              style={{ background: habitatColors[bio.habitat] }}
            >
              {bio.habitat}
            </span>
          </div>

          <div className="modal-title">
            <div className="modal-name">{bio.name}</div>
          </div>
          <div className="modal-sci">{bio.scientificName}</div>

          <div className="modal-section">
            <div className="modal-section-title">📖 生物简介</div>
            <p className="modal-description">{bio.description}</p>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">🔬 科学分类</div>
            <div className="modal-classification">
              {bio.classification.map((cls, i) => (
                <span key={i} className="class-tag">{cls}</span>
              ))}
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">🌊 深度温度分布</div>
            <div className="depth-chart">
              <div
                className="depth-marker"
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`
                }}
              >
                {minDepth}-{maxDepth}m
              </div>
            </div>
            <div className="depth-labels">
              <span>0m 海面</span>
              <span>1000m 弱光层</span>
              <span>5000m 深渊</span>
              <span>10000m 超深渊</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
