import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { createAudioBuffer, playMixSequence } from '../utils/audio';

const MixAnimation: React.FC = () => {
  const { state, endMix } = useApp();
  const [visibleFragments, setVisibleFragments] = useState<number[]>([]);
  const stopMixRef = useRef<(() => void) | null>(null);
  const animationRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const shuffled = state.fragments
      .map((_, i) => i)
      .sort(() => Math.random() - 0.5);

    let index = 0;
    const bpm = 90;
    const beatInterval = (60 / bpm) * 1000;

    const appearNext = () => {
      if (index < shuffled.length) {
        setVisibleFragments(prev => [...prev, shuffled[index]]);
        index++;
        animationRef.current = window.setTimeout(appearNext, beatInterval / 2);
      }
    };
    appearNext();

    const buffers = state.fragments.map(f => createAudioBuffer(f.audioData));
    const shuffledBuffers = shuffled.map(i => buffers[i]);
    stopMixRef.current = playMixSequence(shuffledBuffers, () => {
      setTimeout(endMix, 800);
    });

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
      if (stopMixRef.current) stopMixRef.current();
    };
  }, []);

  useEffect(() => {
    let startTime: number | null = null;
    const bpm = 90;
    const beatDuration = (60 / bpm) * 1000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const beatProgress = (elapsed % beatDuration) / beatDuration;
      const pulseScale = 1 + Math.sin(beatProgress * Math.PI * 2) * 0.08;

      const circle = document.querySelector('.mix-circle') as HTMLElement;
      if (circle) {
        circle.style.transform = `scale(${pulseScale})`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const circleSize = 400;
  const radius = circleSize * 0.35;

  return (
    <div className="mix-overlay">
      <div className="mix-title">创 作 之 旅</div>
      <div className="mix-circle">
        {state.fragments.map((frag, i) => {
          const isVisible = visibleFragments.includes(i);
          const angle = (i / state.fragments.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const color = `hsl(${frag.hue}, 80%, 60%)`;

          return (
            <div
              key={frag.id}
              className="mix-fragment"
              style={{
                background: color,
                color,
                opacity: isVisible ? 1 : 0,
                transform: isVisible
                  ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`
                  : 'translate(-50%, 300%) scale(0.2)',
                transition: isVisible
                  ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease'
                  : 'none'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MixAnimation;
