import React, { useRef, useEffect, useState } from 'react';
import type { AnimationState, JointAngles } from '@/types';

interface TimelineProps {
  state: AnimationState;
  getJointsAtFrame: (frameIndex: number) => JointAngles;
  setCurrentFrame: (frame: number) => void;
  toggleKeyframe: (frameIndex: number, joints: JointAngles) => void;
  togglePlay: () => void;
  stop: () => void;
  toggleLooping: () => void;
  reset: () => void;
  exportAnimation: () => void;
}

const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 60;

export const Timeline: React.FC<TimelineProps> = ({
  state,
  getJointsAtFrame,
  setCurrentFrame,
  toggleKeyframe,
  togglePlay,
  stop,
  toggleLooping,
  reset,
  exportAnimation,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [playheadPos, setPlayheadPos] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(-1);

  useEffect(() => {
    if (lastFrameRef.current !== state.currentFrame) {
      lastFrameRef.current = state.currentFrame;
      const targetPos = state.currentFrame * FRAME_WIDTH + FRAME_WIDTH / 2;
      setPlayheadPos(targetPos);

      const container = scrollRef.current;
      if (container) {
        const viewLeft = container.scrollLeft;
        const viewRight = viewLeft + container.clientWidth;
        if (targetPos < viewLeft + 40) {
          container.scrollLeft = Math.max(0, targetPos - 60);
        } else if (targetPos > viewRight - 40) {
          container.scrollLeft = targetPos - container.clientWidth + 60;
        }
      }
    }
  }, [state.currentFrame]);

  useEffect(() => {
    let lastTime = performance.now();
    let currentAnimPos = playheadPos;

    const animate = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      const targetPos = state.currentFrame * FRAME_WIDTH + FRAME_WIDTH / 2;
      const diff = targetPos - currentAnimPos;
      if (Math.abs(diff) > 0.5) {
        const speed = state.isPlaying ? 8 : 15;
        currentAnimPos += diff * Math.min(1, (delta / 16.67) * speed * 0.1);
        setPlayheadPos(currentAnimPos);
      } else {
        currentAnimPos = targetPos;
        setPlayheadPos(targetPos);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [state.isPlaying, state.currentFrame, playheadPos]);

  const handleFrameClick = (index: number) => {
    setCurrentFrame(index);
  };

  const handleFrameDoubleClick = (index: number) => {
    const joints = getJointsAtFrame(index);
    toggleKeyframe(index, joints);
  };

  const frames = Array.from({ length: state.totalFrames }, (_, i) => i);
  const keyframeSet = new Set(state.keyframes.map((k) => k.index));

  return (
    <div className="timeline-container">
      <div className="timeline-controls">
        <div className="control-group left">
          <button
            className={`control-btn play-btn ${state.isPlaying ? 'active' : ''}`}
            onClick={togglePlay}
            title={state.isPlaying ? '暂停' : '播放'}
          >
            {state.isPlaying ? '⏸' : '▶'}
          </button>
          <button className="control-btn" onClick={stop} title="停止">
            ⏹
          </button>
          <button
            className={`control-btn loop-btn ${state.isLooping ? 'active' : ''}`}
            onClick={toggleLooping}
            title={state.isLooping ? '关闭循环' : '开启循环'}
          >
            🔁
          </button>
        </div>

        <div className="frame-info">
          <span className="frame-label">帧</span>
          <span className="frame-value">{state.currentFrame + 1}</span>
          <span className="frame-separator">/</span>
          <span className="frame-total">{state.totalFrames}</span>
        </div>

        <div className="control-group right">
          <button className="control-btn reset-btn" onClick={reset} title="清空所有帧">
            🗑
          </button>
          <button className="control-btn export-btn" onClick={exportAnimation} title="导出JSON">
            💾
          </button>
        </div>
      </div>

      <div className="timeline-track-wrapper" ref={scrollRef}>
        <div
          className="timeline-track"
          style={{ width: state.totalFrames * FRAME_WIDTH }}
        >
          <div className="timeline-playhead" style={{ left: playheadPos }}>
            <div className="playhead-top" />
            <div className="playhead-line" />
          </div>

          <div className="frames-row">
            {frames.map((i) => {
              const isSelected = i === state.currentFrame;
              const isKey = keyframeSet.has(i);
              return (
                <div
                  key={i}
                  className={`frame-cell ${isSelected ? 'selected' : ''} ${isKey ? 'keyframe' : ''}`}
                  style={{
                    width: FRAME_WIDTH,
                    height: FRAME_HEIGHT,
                  }}
                  onClick={() => handleFrameClick(i)}
                  onDoubleClick={() => handleFrameDoubleClick(i)}
                >
                  {isKey && <div className="keyframe-marker" />}
                  <div className="frame-number">{i + 1}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
