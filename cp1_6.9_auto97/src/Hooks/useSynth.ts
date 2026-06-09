import { useRef, useCallback } from 'react';
import * as Tone from 'tone';

export type InstrumentType = 'piano' | 'guitar' | 'drum';

export interface NoteEvent {
  note: string;
  instrument: InstrumentType;
  userId: string;
  velocity?: number;
  duration?: number;
}

interface SynthRefs {
  piano: Tone.PolySynth | null;
  guitar: Tone.Synth | null;
  guitarDistortion: Tone.Distortion | null;
  drumKick: Tone.MembraneSynth | null;
  drumSnare: Tone.NoiseSynth | null;
  drumHihat: Tone.MetalSynth | null;
  masterGain: Tone.Gain | null;
  initialized: boolean;
}

const DRUM_MAP: Record<string, 'kick' | 'snare' | 'hihat'> = {
  ' ': 'kick',
  'f': 'snare',
  'j': 'hihat'
};

export function useSynth() {
  const synths = useRef<SynthRefs>({
    piano: null,
    guitar: null,
    guitarDistortion: null,
    drumKick: null,
    drumSnare: null,
    drumHihat: null,
    masterGain: null,
    initialized: false
  });

  const initAudio = useCallback(async () => {
    if (synths.current.initialized) return;

    await Tone.start();
    const ctx = Tone.getContext() as any;
    if (ctx && ctx.baseLatency !== undefined) {
      ctx.latencyHint = 'interactive';
    }

    const masterGain = new Tone.Gain(0.8).toDestination();
    synths.current.masterGain = masterGain;

    const piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.02,
        decay: 0.3,
        sustain: 0.3,
        release: 0.8
      }
    }).connect(masterGain);
    piano.volume.value = -5;
    synths.current.piano = piano;

    const distortion = new Tone.Distortion(0.6);
    const guitar = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.01,
        decay: 0.5,
        sustain: 0.1,
        release: 1.5
      }
    }).connect(distortion);
    distortion.connect(masterGain);
    synths.current.guitar = guitar;
    synths.current.guitarDistortion = distortion;

    const drumKick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.05
      }
    }).connect(masterGain);
    synths.current.drumKick = drumKick;

    const drumSnare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.05
      }
    }).connect(masterGain);
    synths.current.drumSnare = drumSnare;

    const drumHihat = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 0.08,
        release: 0.02
      },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5
    }).connect(masterGain);
    drumHihat.volume.value = -15;
    synths.current.drumHihat = drumHihat;

    synths.current.initialized = true;
  }, []);

  const playNote = useCallback((event: NoteEvent) => {
    if (!synths.current.initialized) return;

    const { note, instrument } = event;

    switch (instrument) {
      case 'piano':
        if (synths.current.piano) {
          synths.current.piano.triggerAttackRelease(note, event.duration || 0.3);
        }
        break;

      case 'guitar':
        if (synths.current.guitar) {
          synths.current.guitar.triggerAttackRelease(note, event.duration || 0.5);
        }
        break;

      case 'drum':
        const drumType = DRUM_MAP[note.toLowerCase()] || DRUM_MAP[note];
        if (drumType === 'kick' && synths.current.drumKick) {
          synths.current.drumKick.triggerAttackRelease('C1', event.duration || 0.2);
        } else if (drumType === 'snare' && synths.current.drumSnare) {
          synths.current.drumSnare.triggerAttackRelease(event.duration || 0.2);
        } else if (drumType === 'hihat' && synths.current.drumHihat) {
          synths.current.drumHihat.triggerAttackRelease('8n', event.duration || 0.1);
        } else if (!drumType) {
          if (synths.current.drumKick) {
            synths.current.drumKick.triggerAttackRelease('C1', event.duration || 0.2);
          }
        }
        break;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (synths.current.masterGain) {
      synths.current.masterGain.gain.value = volume / 100;
    }
  }, []);

  return {
    initAudio,
    playNote,
    setVolume
  };
}

export const PIANO_KEY_MAP: Record<string, string> = {
  'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
  'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
  'u': 'A#4', 'j': 'B4', 'k': 'C5',
  'z': 'C5', 'x': 'D5', 'c': 'E5', 'v': 'F5',
  'b': 'G5', 'n': 'A5', 'm': 'B5'
};

export const GUITAR_STRINGS = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

export function getGuitarNote(stringIndex: number, fret: number): string {
  const baseNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const baseNote = GUITAR_STRINGS[stringIndex] || 'E2';
  const noteLetter = baseNote.slice(0, -1);
  const octave = parseInt(baseNote.slice(-1));
  const baseIndex = baseNotes.indexOf(noteLetter);
  const newIndex = (baseIndex + fret) % 12;
  const newOctave = octave + Math.floor((baseIndex + fret) / 12);
  return baseNotes[newIndex] + newOctave;
}

export const DRUM_KEYS = [' ', 'f', 'j'];
export const DRUM_LABELS: Record<string, string> = {
  ' ': '底鼓 (Space)',
  'f': '军鼓 (F)',
  'j': '镲 (J)'
};
