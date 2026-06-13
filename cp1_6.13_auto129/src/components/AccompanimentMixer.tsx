import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Accompaniment } from '../services/apiService';

interface AccompanimentMixerProps {
  accompaniment: Accompaniment | null;
  onPlaybackTimeChange?: (time: number) => void;
}

interface TrackState {
  volume: number;
  muted: boolean;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const noteToFreq = (note: string, octave: number): number => {
  const idx = NOTE_NAMES.indexOf(note);
  if (idx < 0) return 440;
  const semitones = (octave - 4) * 12 + idx - 9;
  return 440 * Math.pow(2, semitones / 12);
};

const trackColors: Record<string, { start: string; end: string; icon: string }> = {
  drums: { start: '#e63946', end: '#f4a261', icon: '🥁' },
  bass: { start: '#2a9d8f', end: '#00b4d8', icon: '🎸' },
  strings: { start: '#7209b7', end: '#b5179e', icon: '🎻' },
};

const AccompanimentMixer: React.FC<AccompanimentMixerProps> = ({
  accompaniment,
  onPlaybackTimeChange,
}) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const drumGainRef = useRef<GainNode | null>(null);
  const bassGainRef = useRef<GainNode | null>(null);
  const stringsGainRef = useRef<GainNode | null>(null);

  const [tracks, setTracks] = useState<Record<string, TrackState>>({
    drums: { volume: 70, muted: false },
    bass: { volume: 60, muted: false },
    strings: { volume: 50, muted: false },
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const playingRef = useRef(false);
  const startTimeRef = useRef(0);
  const scheduledNodesRef = useRef<AudioNode[]>([]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = 0.7;
      masterGainRef.current.connect(audioCtxRef.current.destination);

      drumGainRef.current = audioCtxRef.current.createGain();
      bassGainRef.current = audioCtxRef.current.createGain();
      stringsGainRef.current = audioCtxRef.current.createGain();

      drumGainRef.current.connect(masterGainRef.current);
      bassGainRef.current.connect(masterGainRef.current);
      stringsGainRef.current.connect(masterGainRef.current);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  useEffect(() => {
    if (drumGainRef.current) {
      const vol = tracks.drums.muted ? 0 : tracks.drums.volume / 100;
      drumGainRef.current.gain.setTargetAtTime(vol * 0.8, audioCtxRef.current?.currentTime || 0, 0.02);
    }
    if (bassGainRef.current) {
      const vol = tracks.bass.muted ? 0 : tracks.bass.volume / 100;
      bassGainRef.current.gain.setTargetAtTime(vol * 0.5, audioCtxRef.current?.currentTime || 0, 0.02);
    }
    if (stringsGainRef.current) {
      const vol = tracks.strings.muted ? 0 : tracks.strings.volume / 100;
      stringsGainRef.current.gain.setTargetAtTime(vol * 0.35, audioCtxRef.current?.currentTime || 0, 0.02);
    }
  }, [tracks]);

  const playDrumSample = (
    type: 'kick' | 'snare' | 'hihat',
    ctx: AudioContext,
    dest: AudioNode,
    time: number
  ) => {
    if (type === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.35);
      scheduledNodesRef.current.push(osc, gain);
    } else if (type === 'snare') {
      const noise = ctx.createBufferSource();
      const bufSize = ctx.sampleRate * 0.2;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 200;
      oscGain.gain.setValueAtTime(0.3, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);
      osc.connect(oscGain);
      oscGain.connect(dest);
      noise.start(time);
      osc.start(time);
      noise.stop(time + 0.2);
      osc.stop(time + 0.15);
      scheduledNodesRef.current.push(noise, noiseGain, filter, osc, oscGain);
    } else {
      const noise = ctx.createBufferSource();
      const bufSize = ctx.sampleRate * 0.05;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 5000;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      noise.start(time);
      noise.stop(time + 0.06);
      scheduledNodesRef.current.push(noise, gain, filter);
    }
  };

  const schedulePlayback = useCallback(() => {
    if (!accompaniment || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const startTime = ctx.currentTime + 0.05;
    startTimeRef.current = startTime;

    scheduledNodesRef.current.forEach((n) => {
      try {
        (n as any).disconnect();
      } catch (e) {}
    });
    scheduledNodesRef.current = [];

    const bpm = accompaniment.bpm;
    const beatDur = 60 / bpm;

    accompaniment.drums.kick.forEach((beat) => {
      playDrumSample('kick', ctx, drumGainRef.current!, startTime + beat * beatDur);
    });
    accompaniment.drums.snare.forEach((beat) => {
      playDrumSample('snare', ctx, drumGainRef.current!, startTime + beat * beatDur);
    });
    accompaniment.drums.hihat.forEach((beat) => {
      playDrumSample('hihat', ctx, drumGainRef.current!, startTime + beat * beatDur);
    });

    accompaniment.bass.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      osc.type = 'sawtooth';
      osc.frequency.value = noteToFreq(n.note, n.octave);
      const t = startTime + n.start * beatDur;
      const d = n.duration * beatDur;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + 0.02);
      gain.gain.setValueAtTime(0.6, t + d * 0.5);
      gain.gain.linearRampToValueAtTime(0, t + d);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bassGainRef.current!);
      osc.start(t);
      osc.stop(t + d + 0.05);
      scheduledNodesRef.current.push(osc, gain, filter);
    });

    accompaniment.strings.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = noteToFreq(n.note, n.octave);
      const t = startTime + n.start * beatDur;
      const d = n.duration * beatDur;
      const attack = 0.15;
      const release = 0.3;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + attack);
      gain.gain.setValueAtTime(0.8, t + d - release);
      gain.gain.linearRampToValueAtTime(0, t + d);
      osc.connect(gain);
      gain.connect(stringsGainRef.current!);
      osc.start(t);
      osc.stop(t + d + 0.1);
      scheduledNodesRef.current.push(osc, gain);
    });
  }, [accompaniment]);

  const startPlayback = () => {
    ensureAudio();
    if (!accompaniment || !audioCtxRef.current) return;
    playingRef.current = true;
    setIsPlaying(true);
    schedulePlayback();
  };

  const stopPlayback = () => {
    playingRef.current = false;
    setIsPlaying(false);
    setPlaybackTime(0);
    onPlaybackTimeChange?.(0);
    scheduledNodesRef.current.forEach((n) => {
      try {
        (n as any).disconnect();
      } catch (e) {}
    });
    scheduledNodesRef.current = [];
  };

  useEffect(() => {
    if (!isPlaying || !audioCtxRef.current) return;
    let raf: number;
    const bpm = accompaniment?.bpm || 100;
    const beatDur = 60 / bpm;
    const totalBeats = Math.max(
      ...(accompaniment?.drums.kick || []),
      ...(accompaniment?.drums.snare || []),
      ...(accompaniment?.bass.map((b) => b.start + b.duration) || [])
    );
    const totalDuration = totalBeats * beatDur + 1;

    const update = () => {
      const elapsed = audioCtxRef.current!.currentTime - startTimeRef.current;
      const t = Math.max(0, Math.min(totalDuration, elapsed));
      setPlaybackTime(t);
      onPlaybackTimeChange?.(t);
      if (t >= totalDuration) {
        stopPlayback();
        return;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, accompaniment, onPlaybackTimeChange]);

  const handleVolumeChange = (track: string, vol: number) => {
    setTracks((prev) => ({
      ...prev,
      [track]: { ...prev[track], volume: vol },
    }));
  };

  const handleMuteToggle = (track: string) => {
    setTracks((prev) => ({
      ...prev,
      [track]: { ...prev[track], muted: !prev[track].muted },
    }));
  };

  const renderTrack = (key: string, label: string, desc: string) => {
    const track = tracks[key];
    const color = trackColors[key];
    const muted = track.muted;
    return (
      <div
        style={{
          padding: 14,
          borderRadius: 8,
          background: muted
            ? 'rgba(65, 90, 119, 0.15)'
            : `linear-gradient(135deg, ${color.start}22, ${color.end}18)`,
          border: `1px solid ${muted ? 'rgba(65, 90, 119, 0.3)' : `${color.start}40`}`,
          opacity: muted ? 0.55 : 1,
          filter: muted ? 'grayscale(0.6)' : 'none',
          transition: 'all 200ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: muted ? '#415a77' : `linear-gradient(135deg, ${color.start}, ${color.end})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                boxShadow: muted ? 'none' : `0 2px 10px ${color.start}55`,
              }}
            >
              {color.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#778da9' }}>{desc}</div>
            </div>
          </div>
          <button
            onClick={() => handleMuteToggle(key)}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: muted ? 'rgba(230, 57, 70, 0.2)' : 'rgba(255,255,255,0.08)',
              color: muted ? '#e63946' : '#a8dadc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={muted ? '取消静音' : '静音'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {muted ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </>
              )}
            </svg>
          </button>
        </div>
        <div className="slider-container">
          <span style={{ fontSize: 12, width: 14, color: '#778da9' }}>0</span>
          <input
            type="range"
            min={0}
            max={100}
            value={track.volume}
            onChange={(e) => handleVolumeChange(key, Number(e.target.value))}
          />
          <span style={{ fontSize: 12, width: 28, textAlign: 'right', color: '#a8dadc', fontWeight: 600 }}>
            {track.volume}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#778da9', paddingLeft: 14, paddingRight: 28 }}>
          {[0, 25, 50, 75, 100].map((v) => (
            <span key={v} style={{ width: 1, height: 3, background: 'rgba(119, 141, 169, 0.5)', display: 'inline-block' }} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="panel fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
      <div className="section-title">虚拟乐队混音台</div>

      {!accompaniment ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#778da9', fontSize: 14 }}>
          先选择和弦方案，然后点击「生成伴奏」
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {renderTrack('drums', '打击乐组', `${accompaniment.timeSignature} · BPM ${accompaniment.bpm}`)}
            {renderTrack('bass', '贝斯线条', `根音跟随和弦进行`)}
            {renderTrack('strings', '弦乐铺底', '长音持续和声')}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
            <button
              onClick={isPlaying ? stopPlayback : startPlayback}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: isPlaying
                  ? 'linear-gradient(135deg, #e63946, #c9184a)'
                  : 'linear-gradient(135deg, #00b4d8, #7209b7)',
                boxShadow: isPlaying
                  ? '0 4px 16px rgba(230, 57, 70, 0.5)'
                  : '0 4px 16px rgba(0, 180, 216, 0.4), 0 4px 16px rgba(114, 9, 183, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPlaying ? (
                <>
                  <div style={{ width: 6, height: 22, background: 'white', borderRadius: 2, marginRight: 4 }} />
                  <div style={{ width: 6, height: 22, background: 'white', borderRadius: 2 }} />
                </>
              ) : (
                <div style={{ width: 0, height: 0, borderTop: '14px solid transparent', borderBottom: '14px solid transparent', borderLeft: '22px solid white', marginLeft: 6 }} />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AccompanimentMixer;
