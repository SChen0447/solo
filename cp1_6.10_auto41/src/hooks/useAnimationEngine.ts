import { useState, useRef, useCallback, useEffect } from 'react';
import type { AnimationState, Keyframe, JointAngles, JointId } from '@/types';

const DEFAULT_JOINTS: JointAngles = {
  head: 0,
  torso: 0,
  leftArm: -30,
  rightArm: 30,
  leftLeg: -10,
  rightLeg: 10,
};

const TOTAL_FRAMES = 24;
const FRAME_INTERVAL = 41.7;
const KEYFRAME_EXTRA_INTERVAL = 41.7;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpJoints(a: JointAngles, b: JointAngles, t: number): JointAngles {
  return {
    head: lerp(a.head, b.head, t),
    torso: lerp(a.torso, b.torso, t),
    leftArm: lerp(a.leftArm, b.leftArm, t),
    rightArm: lerp(a.rightArm, b.rightArm, t),
    leftLeg: lerp(a.leftLeg, b.leftLeg, t),
    rightLeg: lerp(a.rightLeg, b.rightLeg, t),
  };
}

export function useAnimationEngine() {
  const [state, setState] = useState<AnimationState>({
    totalFrames: TOTAL_FRAMES,
    currentFrame: 0,
    isPlaying: false,
    isLooping: true,
    keyframes: [],
  });

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const frameAccumRef = useRef<number>(0);
  const keyframeHoldRef = useRef<boolean>(false);

  const getJointsAtFrame = useCallback(
    (frameIndex: number, keyframes: Keyframe[]): JointAngles => {
      if (keyframes.length === 0) {
        return { ...DEFAULT_JOINTS };
      }

      const sorted = [...keyframes].sort((a, b) => a.index - b.index);
      const exact = sorted.find((k) => k.index === frameIndex);
      if (exact) {
        return { ...exact.joints };
      }

      if (frameIndex < sorted[0].index) {
        return { ...sorted[0].joints };
      }

      if (frameIndex > sorted[sorted.length - 1].index) {
        return { ...sorted[sorted.length - 1].joints };
      }

      let prevKf = sorted[0];
      let nextKf = sorted[sorted.length - 1];
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].index <= frameIndex && sorted[i + 1].index >= frameIndex) {
          prevKf = sorted[i];
          nextKf = sorted[i + 1];
          break;
        }
      }

      const span = nextKf.index - prevKf.index;
      const t = span === 0 ? 0 : (frameIndex - prevKf.index) / span;
      return lerpJoints(prevKf.joints, nextKf.joints, t);
    },
    []
  );

  const getCurrentJoints = useCallback((): JointAngles => {
    return getJointsAtFrame(state.currentFrame, state.keyframes);
  }, [state.currentFrame, state.keyframes, getJointsAtFrame]);

  const isKeyframe = useCallback(
    (frameIndex: number): boolean => {
      return state.keyframes.some((k) => k.index === frameIndex);
    },
    [state.keyframes]
  );

  const setCurrentFrame = useCallback((frame: number) => {
    setState((prev) => ({
      ...prev,
      currentFrame: Math.max(0, Math.min(frame, prev.totalFrames - 1)),
    }));
  }, []);

  const toggleKeyframe = useCallback((frameIndex: number, joints: JointAngles) => {
    setState((prev) => {
      const exists = prev.keyframes.find((k) => k.index === frameIndex);
      if (exists) {
        return {
          ...prev,
          keyframes: prev.keyframes.filter((k) => k.index !== frameIndex),
        };
      } else {
        return {
          ...prev,
          keyframes: [...prev.keyframes, { index: frameIndex, joints: { ...joints } }],
        };
      }
    });
  }, []);

  const addKeyframe = useCallback((frameIndex: number, joints: JointAngles) => {
    setState((prev) => {
      const filtered = prev.keyframes.filter((k) => k.index !== frameIndex);
      return {
        ...prev,
        keyframes: [...filtered, { index: frameIndex, joints: { ...joints } }],
      };
    });
  }, []);

  const deleteKeyframe = useCallback((frameIndex: number) => {
    setState((prev) => ({
      ...prev,
      keyframes: prev.keyframes.filter((k) => k.index !== frameIndex),
    }));
  }, []);

  const updateJointAtFrame = useCallback(
    (frameIndex: number, jointId: JointId, angle: number) => {
      setState((prev) => {
        const currentJoints = getJointsAtFrame(frameIndex, prev.keyframes);
        const newJoints = { ...currentJoints, [jointId]: angle };
        const existing = prev.keyframes.find((k) => k.index === frameIndex);
        let newKeyframes: Keyframe[];
        if (existing) {
          newKeyframes = prev.keyframes.map((k) =>
            k.index === frameIndex ? { ...k, joints: newJoints } : k
          );
        } else {
          newKeyframes = [...prev.keyframes, { index: frameIndex, joints: newJoints }];
        }
        return { ...prev, keyframes: newKeyframes };
      });
    },
    [getJointsAtFrame]
  );

  const play = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const stop = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false, currentFrame: 0 }));
    frameAccumRef.current = 0;
    keyframeHoldRef.current = false;
  }, []);

  const toggleLooping = useCallback(() => {
    setState((prev) => ({ ...prev, isLooping: !prev.isLooping }));
  }, []);

  const reset = useCallback(() => {
    setState({
      totalFrames: TOTAL_FRAMES,
      currentFrame: 0,
      isPlaying: false,
      isLooping: true,
      keyframes: [],
    });
    frameAccumRef.current = 0;
    keyframeHoldRef.current = false;
  }, []);

  const exportAnimation = useCallback(() => {
    const data = {
      frames: state.keyframes
        .sort((a, b) => a.index - b.index)
        .map((k) => ({
          index: k.index,
          joints: { ...k.joints },
        })),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animation_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.keyframes]);

  useEffect(() => {
    if (!state.isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      frameAccumRef.current += delta;

      const currentIsKeyframe = state.keyframes.some(
        (k) => k.index === state.currentFrame
      );
      const interval =
        currentIsKeyframe && keyframeHoldRef.current
          ? FRAME_INTERVAL + KEYFRAME_EXTRA_INTERVAL
          : FRAME_INTERVAL;

      if (frameAccumRef.current >= interval) {
        frameAccumRef.current = 0;
        keyframeHoldRef.current = !keyframeHoldRef.current || !currentIsKeyframe;

        setState((prev) => {
          let nextFrame = prev.currentFrame + 1;
          if (nextFrame >= prev.totalFrames) {
            if (prev.isLooping) {
              nextFrame = 0;
            } else {
              return { ...prev, isPlaying: false };
            }
          }
          return { ...prev, currentFrame: nextFrame };
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state.isPlaying, state.keyframes, state.currentFrame, state.totalFrames]);

  return {
    state,
    getCurrentJoints,
    getJointsAtFrame,
    isKeyframe,
    setCurrentFrame,
    toggleKeyframe,
    addKeyframe,
    deleteKeyframe,
    updateJointAtFrame,
    play,
    pause,
    togglePlay,
    stop,
    toggleLooping,
    reset,
    exportAnimation,
  };
}
