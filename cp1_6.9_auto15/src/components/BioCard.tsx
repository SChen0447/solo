import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { BioData, habitatColors } from '../data/bioData';

interface BioCardProps {
  bio: BioData;
  onClick: () => void;
}

export const BioCard = ({ bio, onClick }: BioCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLSpanElement>(null);
  const frameIndex = useRef(0);

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
    }, 800);
    return () => clearInterval(interval);
  }, [bio.frames]);

  useEffect(() => {
    if (cardRef.current) {
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 30,
        scale: 0.9,
        duration: 0.5,
        ease: 'back.out(1.2)',
        delay: (bio.id % 10) * 0.03
      });
    }
  }, [bio.id]);

  return (
    <div ref={cardRef} className="bio-card" onClick={onClick}>
      <div
        className="bio-card-thumb"
        style={{ background: bio.color }}
      >
        <span
          ref={emojiRef}
          className="bio-card-emoji"
        >
          {bio.frames[0]}
        </span>
        <span
          className="bio-card-habitat"
          style={{ background: habitatColors[bio.habitat] }}
        >
          {bio.habitat}
        </span>
        <span className="bio-card-depth">
          {bio.depthRange[0]}-{bio.depthRange[1]}m
        </span>
      </div>
      <div className="bio-card-info">
        <div className="bio-card-name">{bio.name}</div>
        <div className="bio-card-sci">{bio.scientificName}</div>
      </div>
    </div>
  );
};
