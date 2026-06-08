import { Keyframe, WaveformType, FilterType, ParticleConfig } from '../types';
import { linearInterpolation } from './index';

export const getInterpolatedState = (
  keyframes: Keyframe[],
  currentTime: number
): {
  waveformType: WaveformType;
  filterType: FilterType;
  particleConfig: ParticleConfig;
} => {
  if (keyframes.length === 0) {
    return {
      waveformType: 'bar',
      filterType: 'none',
      particleConfig: { count: 50, size: 3, speed: 2 },
    };
  }

  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

  if (currentTime <= sortedKeyframes[0].time) {
    return {
      waveformType: sortedKeyframes[0].waveformType,
      filterType: sortedKeyframes[0].filterType,
      particleConfig: { ...sortedKeyframes[0].particleConfig },
    };
  }

  if (currentTime >= sortedKeyframes[sortedKeyframes.length - 1].time) {
    const last = sortedKeyframes[sortedKeyframes.length - 1];
    return {
      waveformType: last.waveformType,
      filterType: last.filterType,
      particleConfig: { ...last.particleConfig },
    };
  }

  for (let i = 0; i < sortedKeyframes.length - 1; i++) {
    const prev = sortedKeyframes[i];
    const next = sortedKeyframes[i + 1];

    if (currentTime >= prev.time && currentTime <= next.time) {
      const t = (currentTime - prev.time) / (next.time - prev.time);

      const interpolatedConfig: ParticleConfig = {
        count: Math.round(linearInterpolation(prev.particleConfig.count, next.particleConfig.count, t)),
        size: linearInterpolation(prev.particleConfig.size, next.particleConfig.size, t),
        speed: linearInterpolation(prev.particleConfig.speed, next.particleConfig.speed, t),
      };

      const waveformType = t < 0.5 ? prev.waveformType : next.waveformType;
      const filterType = t < 0.5 ? prev.filterType : next.filterType;

      return {
        waveformType,
        filterType,
        particleConfig: interpolatedConfig,
      };
    }
  }

  return {
    waveformType: sortedKeyframes[0].waveformType,
    filterType: sortedKeyframes[0].filterType,
    particleConfig: { ...sortedKeyframes[0].particleConfig },
  };
};

export const addKeyframe = (
  keyframes: Keyframe[],
  time: number,
  waveformType: WaveformType,
  filterType: FilterType,
  particleConfig: ParticleConfig
): Keyframe[] => {
  const newKeyframe: Keyframe = {
    id: `kf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    time,
    waveformType,
    filterType,
    particleConfig: { ...particleConfig },
  };

  const result = [...keyframes.filter(k => Math.abs(k.time - time) > 100), newKeyframe];
  return result.sort((a, b) => a.time - b.time);
};

export const removeKeyframe = (keyframes: Keyframe[], id: string): Keyframe[] => {
  return keyframes.filter(k => k.id !== id);
};

export const updateKeyframeTime = (keyframes: Keyframe[], id: string, newTime: number): Keyframe[] => {
  return keyframes
    .map(k => (k.id === id ? { ...k, time: newTime } : k))
    .sort((a, b) => a.time - b.time);
};
