import { useRef, useCallback, useEffect } from 'react';
import type { EmotionType } from '@/types';

interface AudioEngineState {
  isPlaying: boolean;
  masterVolume: number;
  currentEmotion: EmotionType;
}

const NOTE_FREQUENCIES: Record<string, number> = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
  'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
  'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  'C3': 130.81, 'E3': 164.81, 'G3': 196.00,
};

const HAPPY_ARPEGGIO = ['C5', 'E5', 'G5', 'C6', 'G5', 'E5'];
const SAD_MELODY = ['A4', 'Ab4', 'G4', 'F#4', 'G4', 'Ab4'];
const CALM_ARPEGGIO = ['C4', 'E4', 'G4', 'B4', 'G4', 'E4'];
const TENSE_MELODY = ['C5', 'B4', 'C5', 'D5', 'C5', 'B4'];

const useAudioEngine = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  
  const stateRef = useRef<AudioEngineState>({
    isPlaying: false,
    masterVolume: 0.7,
    currentEmotion: 'calm',
  });

  const musicSchedulerRef = useRef<{
    nextNoteTime: number;
    noteIndex: number;
    intervalId: number | null;
    currentNotes: OscillatorNode[];
  }>({
    nextNoteTime: 0,
    noteIndex: 0,
    intervalId: null,
    currentNotes: [],
  });

  const ambientRef = useRef<{
    noiseNode: AudioBufferSourceNode | null;
    filterNode: BiquadFilterNode | null;
    gainNode: GainNode | null;
    type: string;
  }>({
    noiseNode: null,
    filterNode: null,
    gainNode: null,
    type: '',
  });

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;
    
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioContextRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = stateRef.current.masterVolume;
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    const musicGain = ctx.createGain();
    musicGain.gain.value = 0.3;
    musicGain.connect(masterGain);
    musicGainRef.current = musicGain;

    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.15;
    ambientGain.connect(masterGain);
    ambientGainRef.current = ambientGain;
  }, []);

  const playNote = useCallback((frequency: number, startTime: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): OscillatorNode => {
    const ctx = audioContextRef.current!;
    const gainNode = musicGainRef.current!;

    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    noteGain.gain.setValueAtTime(volume, startTime + duration - 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(noteGain);
    noteGain.connect(gainNode);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);

    return osc;
  }, []);

  const getMelody = useCallback((emotion: EmotionType): string[] => {
    switch (emotion) {
      case 'happy': return HAPPY_ARPEGGIO;
      case 'sad': return SAD_MELODY;
      case 'tense': return TENSE_MELODY;
      default: return CALM_ARPEGGIO;
    }
  }, []);

  const getTempo = useCallback((emotion: EmotionType): number => {
    switch (emotion) {
      case 'happy': return 120;
      case 'sad': return 60;
      case 'tense': return 100;
      default: return 80;
    }
  }, []);

  const getTimbre = useCallback((emotion: EmotionType): OscillatorType => {
    switch (emotion) {
      case 'happy': return 'triangle';
      case 'sad': return 'sine';
      case 'tense': return 'sawtooth';
      default: return 'sine';
    }
  }, []);

  const startMusic = useCallback((emotion: EmotionType) => {
    const ctx = audioContextRef.current;
    if (!ctx || !musicGainRef.current) return;

    stopMusic();
    stateRef.current.currentEmotion = emotion;

    const melody = getMelody(emotion);
    const tempo = getTempo(emotion);
    const timbre = getTimbre(emotion);
    const noteDuration = 60 / tempo * 0.8;

    musicSchedulerRef.current.noteIndex = 0;
    musicSchedulerRef.current.nextNoteTime = ctx.currentTime + 0.1;

    const scheduleNextNote = () => {
      if (!stateRef.current.isPlaying) return;

      const noteName = melody[musicSchedulerRef.current.noteIndex % melody.length];
      const freq = NOTE_FREQUENCIES[noteName] || 440;

      const note = playNote(
        freq,
        musicSchedulerRef.current.nextNoteTime,
        noteDuration,
        timbre,
        0.25,
      );
      musicSchedulerRef.current.currentNotes.push(note);

      musicSchedulerRef.current.noteIndex++;
      musicSchedulerRef.current.nextNoteTime += noteDuration * 1.2;
    };

    for (let i = 0; i < 4; i++) {
      scheduleNextNote();
    }

    musicSchedulerRef.current.intervalId = window.setInterval(() => {
      if (stateRef.current.isPlaying) {
        const ctxNow = audioContextRef.current;
        if (ctxNow && musicSchedulerRef.current.nextNoteTime < ctxNow.currentTime + 0.5) {
          scheduleNextNote();
        }
      }
    }, 100);
  }, [getMelody, getTempo, getTimbre, playNote]);

  const stopMusic = useCallback(() => {
    if (musicSchedulerRef.current.intervalId) {
      clearInterval(musicSchedulerRef.current.intervalId);
      musicSchedulerRef.current.intervalId = null;
    }
    musicSchedulerRef.current.currentNotes.forEach((note) => {
      try {
        note.stop();
        note.disconnect();
      } catch (e) {
        // ignore
      }
    });
    musicSchedulerRef.current.currentNotes = [];
  }, []);

  const crossfadeEmotion = useCallback((newEmotion: EmotionType, duration: number = 0.5) => {
    const ctx = audioContextRef.current;
    const musicGain = musicGainRef.current;
    if (!ctx || !musicGain) return;

    const currentTime = ctx.currentTime;
    musicGain.gain.setValueAtTime(musicGain.gain.value, currentTime);
    musicGain.gain.linearRampToValueAtTime(0.05, currentTime + duration / 2);

    setTimeout(() => {
      startMusic(newEmotion);
      if (audioContextRef.current && musicGainRef.current) {
        const ctx2 = audioContextRef.current;
        musicGainRef.current.gain.setValueAtTime(0.05, ctx2.currentTime);
        musicGainRef.current.gain.linearRampToValueAtTime(0.3, ctx2.currentTime + duration / 2);
      }
    }, (duration / 2) * 1000);
  }, [startMusic]);

  const createWhiteNoise = useCallback((): AudioBuffer => {
    const ctx = audioContextRef.current!;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }, []);

  const playAmbientSound = useCallback((type: 'rain' | 'wind' | 'birds' | 'none') => {
    const ctx = audioContextRef.current;
    const ambientGain = ambientGainRef.current;
    if (!ctx || !ambientGain) return;

    if (ambientRef.current.noiseNode) {
      try {
        ambientRef.current.noiseNode.stop();
        ambientRef.current.noiseNode.disconnect();
      } catch (e) {
        // ignore
      }
      ambientRef.current.noiseNode = null;
    }

    if (type === 'none') {
      ambientRef.current.type = 'none';
      return;
    }

    const noiseBuffer = createWhiteNoise();
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    switch (type) {
      case 'rain':
        filter.type = 'lowpass';
        filter.frequency.value = 1500;
        gain.gain.value = 0.12;
        break;
      case 'wind':
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 0.5;
        gain.gain.value = 0.08;
        break;
      case 'birds':
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        gain.gain.value = 0.05;
        break;
      default:
        gain.gain.value = 0;
    }

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ambientGain);
    noiseSource.start();

    ambientRef.current.noiseNode = noiseSource;
    ambientRef.current.filterNode = filter;
    ambientRef.current.gainNode = gain;
    ambientRef.current.type = type;
  }, [createWhiteNoise]);

  const playDing = useCallback(() => {
    const ctx = audioContextRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  const setVolume = useCallback((volume: number) => {
    stateRef.current.masterVolume = volume;
    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.1);
    }
  }, []);

  const play = useCallback((emotion: EmotionType = 'calm') => {
    initAudioContext();
    stateRef.current.isPlaying = true;
    startMusic(emotion);
  }, [initAudioContext, startMusic]);

  const pause = useCallback(() => {
    stateRef.current.isPlaying = false;
    stopMusic();
  }, [stopMusic]);

  const resume = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    stateRef.current.isPlaying = true;
    startMusic(stateRef.current.currentEmotion);
  }, [startMusic]);

  const dispose = useCallback(() => {
    stateRef.current.isPlaying = false;
    stopMusic();
    
    if (ambientRef.current.noiseNode) {
      try {
        ambientRef.current.noiseNode.stop();
        ambientRef.current.noiseNode.disconnect();
      } catch (e) {
        // ignore
      }
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [stopMusic]);

  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    initAudioContext,
    play,
    pause,
    resume,
    setVolume,
    crossfadeEmotion,
    playAmbientSound,
    playDing,
    dispose,
    getAudioContext: () => audioContextRef.current,
  };
};

export default useAudioEngine;
