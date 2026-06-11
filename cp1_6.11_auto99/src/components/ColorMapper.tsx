import { useRef, useEffect, useCallback } from 'react';
import { audioEngine } from './AudioEngine';
import { useAudioStore } from '@/store/audioStore';
import { calculateBandEnergy } from '@/utils/audioUtils';
import { hexToHSL, hslToHex, lerpHSL, type HSL } from '@/utils/colorUtils';

export default function ColorMapper() {
  const currentHSLRef = useRef<HSL>({ h: 150, s: 100, l: 60 });
  const targetHSLRef = useRef<HSL>({ h: 150, s: 100, l: 60 });
  const currentSecHSLRef = useRef<HSL>({ h: 210, s: 100, l: 70 });
  const targetSecHSLRef = useRef<HSL>({ h: 210, s: 100, l: 70 });
  const animRef = useRef<number>(0);
  const tracks = useAudioStore((s) => s.tracks);
  const setThemeColors = useAudioStore((s) => s.setThemeColors);

  const compute = useCallback(() => {
    let totalLow = 0, totalMid = 0, totalHigh = 0;
    let count = 0;

    for (let i = 0; i < 4; i++) {
      if (tracks[i].loaded && tracks[i].playing) {
        const data = audioEngine.getFrequencyData(i);
        const energy = calculateBandEnergy(data, audioEngine.getSampleRate());
        totalLow += energy.low;
        totalMid += energy.mid;
        totalHigh += energy.high;
        count++;
      }
    }

    if (count === 0) {
      totalLow = 0.05;
      totalMid = 0.1;
      totalHigh = 0.05;
    } else {
      totalLow /= count;
      totalMid /= count;
      totalHigh /= count;
    }

    const total = totalLow + totalMid + totalHigh || 1;
    const lowRatio = totalLow / total;
    const midRatio = totalMid / total;
    const highRatio = totalHigh / total;

    const primaryH = lowRatio * 340 + midRatio * 150 + highRatio * 210;
    const primaryS = 70 + midRatio * 30;
    const primaryL = 45 + totalMid * 25;

    const secH = highRatio * 210 + midRatio * 160 + lowRatio * 340;
    const secS = 60 + highRatio * 40;
    const secL = 55 + totalHigh * 20;

    targetHSLRef.current = { h: primaryH % 360, s: Math.min(100, primaryS), l: Math.min(80, primaryL) };
    targetSecHSLRef.current = { h: secH % 360, s: Math.min(100, secS), l: Math.min(80, secL) };
  }, [tracks]);

  useEffect(() => {
    const lerpSpeed = 1 / (0.5 * 60);

    const update = () => {
      compute();

      currentHSLRef.current = lerpHSL(currentHSLRef.current, targetHSLRef.current, lerpSpeed);
      currentSecHSLRef.current = lerpHSL(currentSecHSLRef.current, targetSecHSLRef.current, lerpSpeed);

      const primary = hslToHex(currentHSLRef.current);
      const secondary = hslToHex(currentSecHSLRef.current);
      const glow = primary + '40';

      setThemeColors({ primary, secondary, glow });

      animRef.current = requestAnimationFrame(update);
    };

    animRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animRef.current);
  }, [compute, setThemeColors]);

  return null;
}
