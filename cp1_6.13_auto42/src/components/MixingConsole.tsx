import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import EffectRack, {
  EffectType,
  EffectSlot,
  EffectParams,
  DEFAULT_PARAMS,
} from './EffectRack';
import { wsClient, SyncMessage } from '../websocket';
import axios from 'axios';

interface Track {
  id: string;
  name: string;
  fileUrl: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  waveform: number[];
  effects: (EffectSlot | null)[];
  audioBuffer: AudioBuffer | null;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  isPlaying: boolean;
}

interface Preset {
  id: string;
  name: string;
  createdAt: string;
  thumbnail: string;
  data: {
    tracks: {
      name: string;
      volume: number;
      muted: boolean;
      solo: boolean;
      effects: (EffectSlot | null)[];
    }[];
  };
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const generateWaveform = (buffer: AudioBuffer, bars: number = 60): number[] => {
  const data = buffer.getChannelData(0);
  const step = Math.floor(data.length / bars);
  const waveform: number[] = [];
  for (let i = 0; i < bars; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const abs = Math.abs(data[i * step + j]);
      if (abs > max) max = abs;
    }
    waveform.push(max);
  }
  return waveform;
};

const captureThumbnail = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, 160, 90);
  ctx.strokeStyle = '#e2a93b';
  ctx.lineWidth = 1;
  for (let x = 10; x < 150; x += 6) {
    const h = Math.random() * 30 + 10;
    ctx.beginPath();
    ctx.moveTo(x, 45 - h / 2);
    ctx.lineTo(x, 45 + h / 2);
    ctx.stroke();
  }
  return canvas.toDataURL('image/png');
};

const createEmptyTrack = (): Track => ({
  id: generateId(),
  name: '主音轨',
  fileUrl: '',
  volume: 75,
  muted: false,
  solo: false,
  waveform: [],
  effects: [null, null, null],
  audioBuffer: null,
  sourceNode: null,
  gainNode: null,
  isPlaying: false,
});

const MixingConsole: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([createEmptyTrack()]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [uploadCancelToken, setUploadCancelToken] = useState<AbortController | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [flashingTracks, setFlashingTracks] = useState<Set<number>>(new Set());
  const [flashingSlots, setFlashingSlots] = useState<Map<number, Set<number>>>(new Map());
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [fadePreset, setFadePreset] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const effectNodesRef = useRef<Map<string, AudioNode[]>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTrackIndexRef = useRef<number>(0);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const applyEffects = useCallback(
    (track: Track, trackIndex: number) => {
      const ctx = getAudioContext();
      const key = track.id;
      const oldNodes = effectNodesRef.current.get(key);
      if (oldNodes) {
        oldNodes.forEach((n) => {
          try { (n as AudioNode).disconnect(); } catch { /* ignore */ }
        });
      }

      const nodes: AudioNode[] = [];
      let lastNode: AudioNode | null = track.gainNode;
      if (!lastNode) return;

      track.effects.forEach((slot) => {
        if (!slot) return;

        switch (slot.type) {
          case 'eq': {
            const p = slot.params as EffectParams['eq'];
            const low = ctx.createBiquadFilter();
            low.type = 'lowshelf';
            low.frequency.value = 320;
            low.gain.value = p.low;
            const mid = ctx.createBiquadFilter();
            mid.type = 'peaking';
            mid.frequency.value = 1000;
            mid.Q.value = 1;
            mid.gain.value = p.mid;
            const high = ctx.createBiquadFilter();
            high.type = 'highshelf';
            high.frequency.value = 3200;
            high.gain.value = p.high;
            if (lastNode) lastNode.connect(low);
            low.connect(mid);
            mid.connect(high);
            lastNode = high;
            nodes.push(low, mid, high);
            break;
          }
          case 'compressor': {
            const p = slot.params as EffectParams['compressor'];
            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = p.threshold;
            comp.ratio.value = p.ratio;
            comp.attack.value = 0.003;
            comp.release.value = 0.25;
            if (lastNode) lastNode.connect(comp);
            lastNode = comp;
            nodes.push(comp);
            break;
          }
          case 'reverb': {
            const p = slot.params as EffectParams['reverb'];
            const convolver = ctx.createConvolver();
            const rate = ctx.sampleRate;
            const length = rate * (p.roomSize / 50) * 2;
            const impulse = ctx.createBuffer(2, Math.max(1, length), rate);
            for (let ch = 0; ch < 2; ch++) {
              const data = impulse.getChannelData(ch);
              for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
              }
            }
            convolver.buffer = impulse;
            const dryGain = ctx.createGain();
            dryGain.gain.value = 1 - p.dryWet / 100;
            const wetGain = ctx.createGain();
            wetGain.gain.value = p.dryWet / 100;
            if (lastNode) {
              lastNode.connect(dryGain);
              lastNode.connect(convolver);
            }
            convolver.connect(wetGain);
            const merger = ctx.createGain();
            dryGain.connect(merger);
            wetGain.connect(merger);
            lastNode = merger;
            nodes.push(convolver, dryGain, wetGain, merger);
            break;
          }
          case 'delay': {
            const p = slot.params as EffectParams['delay'];
            const delay = ctx.createDelay(5);
            delay.delayTime.value = p.time / 1000;
            const feedback = ctx.createGain();
            feedback.gain.value = p.feedback / 100;
            const dryGain = ctx.createGain();
            dryGain.gain.value = 0.7;
            const wetGain = ctx.createGain();
            wetGain.gain.value = 0.5;
            if (lastNode) {
              lastNode.connect(dryGain);
              lastNode.connect(delay);
            }
            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(wetGain);
            const merger = ctx.createGain();
            dryGain.connect(merger);
            wetGain.connect(merger);
            lastNode = merger;
            nodes.push(delay, feedback, dryGain, wetGain, merger);
            break;
          }
        }
      });

      if (lastNode) {
        lastNode.connect(ctx.destination);
      }

      effectNodesRef.current.set(key, nodes);
    },
    [getAudioContext]
  );

  const playTrack = useCallback(
    (trackIndex: number) => {
      const track = tracks[trackIndex];
      if (!track || !track.audioBuffer) return;

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      if (track.sourceNode) {
        try { track.sourceNode.stop(); } catch { /* ignore */ }
      }

      const source = ctx.createBufferSource();
      source.buffer = track.audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = track.muted ? 0 : track.volume / 100;
      source.connect(gain);

      const updatedTrack = { ...track, sourceNode: source, gainNode: gain };
      source.connect(gain);
      source.start(0);

      const newTracks = [...tracks];
      newTracks[trackIndex] = { ...updatedTrack, isPlaying: true };
      setTracks(newTracks);

      applyEffects(updatedTrack, trackIndex);
    },
    [tracks, getAudioContext, applyEffects]
  );

  const stopTrack = useCallback(
    (trackIndex: number) => {
      const track = tracks[trackIndex];
      if (!track) return;
      if (track.sourceNode) {
        try { track.sourceNode.stop(); } catch { /* ignore */ }
      }
      const newTracks = [...tracks];
      newTracks[trackIndex] = {
        ...track,
        sourceNode: null,
        isPlaying: false,
      };
      setTracks(newTracks);
    },
    [tracks]
  );

  const handleFileUpload = useCallback(
    async (file: File, trackIndex: number) => {
      if (!file) return;
      const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3)$/i)) {
        alert('请上传 WAV 或 MP3 格式的音频文件');
        return;
      }

      const duration = 5 * 60;
      const ctx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();

      try {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (audioBuffer.duration > duration) {
          alert('音频文件不能超过5分钟');
          return;
        }

        const waveform = generateWaveform(audioBuffer);
        const newTracks = [...tracks];
        newTracks[trackIndex] = {
          ...newTracks[trackIndex],
          name: file.name.replace(/\.(wav|mp3)$/i, ''),
          fileUrl: URL.createObjectURL(file),
          audioBuffer,
          waveform,
        };
        setTracks(newTracks);
      } catch {
        const abortController = new AbortController();
        setUploadCancelToken(abortController);
        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('audio', file);

        try {
          const res = await axios.post('/api/upload', formData, {
            signal: abortController.signal,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
              }
            },
          });

          const audioUrl = res.data.url;
          const audioArrBuf = await (await fetch(audioUrl)).arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(audioArrBuf);
          const waveform = generateWaveform(audioBuffer);

          const newTracks = [...tracks];
          newTracks[trackIndex] = {
            ...newTracks[trackIndex],
            name: file.name.replace(/\.(wav|mp3)$/i, ''),
            fileUrl: audioUrl,
            audioBuffer,
            waveform,
          };
          setTracks(newTracks);
        } catch (err) {
          if (!abortController.signal.aborted) {
            alert('上传失败，请重试');
          }
        } finally {
          setUploading(false);
          setUploadProgress(0);
          setUploadCancelToken(null);
        }
      }
    },
    [tracks, getAudioContext]
  );

  const cancelUpload = useCallback(() => {
    uploadCancelToken?.abort();
    setUploading(false);
    setUploadProgress(0);
  }, [uploadCancelToken]);

  const handleVolumeChange = useCallback(
    (trackIndex: number, volume: number) => {
      const newTracks = [...tracks];
      newTracks[trackIndex] = { ...newTracks[trackIndex], volume };
      if (newTracks[trackIndex].gainNode) {
        newTracks[trackIndex].gainNode!.gain.value = newTracks[trackIndex].muted ? 0 : volume / 100;
      }
      setTracks(newTracks);

      if (isCollaborating) {
        wsClient.send({ type: 'paramUpdate', trackIndex, paramName: 'volume', value: volume });
      }
    },
    [tracks, isCollaborating]
  );

  const handleMuteToggle = useCallback(
    (trackIndex: number) => {
      const newTracks = [...tracks];
      newTracks[trackIndex] = { ...newTracks[trackIndex], muted: !newTracks[trackIndex].muted };
      if (newTracks[trackIndex].gainNode) {
        newTracks[trackIndex].gainNode!.gain.value = newTracks[trackIndex].muted ? 0 : newTracks[trackIndex].volume / 100;
      }
      setTracks(newTracks);

      if (isCollaborating) {
        wsClient.send({ type: 'paramUpdate', trackIndex, paramName: 'muted', value: newTracks[trackIndex].muted });
      }
    },
    [tracks, isCollaborating]
  );

  const handleSoloToggle = useCallback(
    (trackIndex: number) => {
      const newTracks = [...tracks];
      newTracks[trackIndex] = { ...newTracks[trackIndex], solo: !newTracks[trackIndex].solo };

      const hasSolo = newTracks.some((t) => t.solo);
      newTracks.forEach((t, i) => {
        if (t.gainNode) {
          const shouldMute = hasSolo ? !t.solo : t.muted;
          t.gainNode!.gain.value = shouldMute ? 0 : t.volume / 100;
        }
      });

      setTracks(newTracks);

      if (isCollaborating) {
        wsClient.send({ type: 'paramUpdate', trackIndex, paramName: 'solo', value: newTracks[trackIndex].solo });
      }
    },
    [tracks, isCollaborating]
  );

  const handleEffectSlotChange = useCallback(
    (trackIndex: number, slotIndex: number, effectType: EffectType) => {
      const newTracks = [...tracks];
      const newEffects = [...newTracks[trackIndex].effects];
      newEffects[slotIndex] = {
        type: effectType,
        params: { ...DEFAULT_PARAMS[effectType] },
        expanded: true,
      };
      newTracks[trackIndex] = { ...newTracks[trackIndex], effects: newEffects };
      setTracks(newTracks);

      if (newTracks[trackIndex].isPlaying) {
        applyEffects(newTracks[trackIndex], trackIndex);
      }

      if (isCollaborating) {
        wsClient.send({ type: 'paramUpdate', trackIndex, effectIndex: slotIndex, paramName: 'effectType', value: effectType });
      }
    },
    [tracks, isCollaborating, applyEffects]
  );

  const handleEffectSlotRemove = useCallback(
    (trackIndex: number, slotIndex: number) => {
      const newTracks = [...tracks];
      const newEffects = [...newTracks[trackIndex].effects];
      newEffects[slotIndex] = null;
      newTracks[trackIndex] = { ...newTracks[trackIndex], effects: newEffects };
      setTracks(newTracks);

      if (newTracks[trackIndex].isPlaying) {
        applyEffects(newTracks[trackIndex], trackIndex);
      }

      if (isCollaborating) {
        wsClient.send({ type: 'paramUpdate', trackIndex, effectIndex: slotIndex, paramName: 'effectType', value: null });
      }
    },
    [tracks, isCollaborating, applyEffects]
  );

  const handleEffectToggleExpand = useCallback(
    (trackIndex: number, slotIndex: number) => {
      const newTracks = [...tracks];
      const newEffects = [...newTracks[trackIndex].effects];
      if (newEffects[slotIndex]) {
        newEffects[slotIndex] = { ...newEffects[slotIndex]!, expanded: !newEffects[slotIndex]!.expanded };
      }
      newTracks[trackIndex] = { ...newTracks[trackIndex], effects: newEffects };
      setTracks(newTracks);
    },
    [tracks]
  );

  const handleEffectParamChange = useCallback(
    (trackIndex: number, slotIndex: number, paramName: string, value: number) => {
      const newTracks = [...tracks];
      const newEffects = [...newTracks[trackIndex].effects];
      if (newEffects[slotIndex]) {
        newEffects[slotIndex] = {
          ...newEffects[slotIndex]!,
          params: { ...(newEffects[slotIndex]!.params as Record<string, unknown>), [paramName]: value },
        };
      }
      newTracks[trackIndex] = { ...newTracks[trackIndex], effects: newEffects };
      setTracks(newTracks);

      if (newTracks[trackIndex].isPlaying) {
        applyEffects(newTracks[trackIndex], trackIndex);
      }

      if (isCollaborating) {
        wsClient.send({ type: 'paramUpdate', trackIndex, effectIndex: slotIndex, paramName, value });
      }
    },
    [tracks, isCollaborating, applyEffects]
  );

  const handleAddTrack = useCallback(() => {
    if (tracks.length >= 4) return;
    const newTrack = createEmptyTrack();
    newTrack.name = `音轨 ${tracks.length + 1}`;
    setTracks([...tracks, newTrack]);
  }, [tracks]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: Preset = {
      id: generateId(),
      name: presetName.trim(),
      createdAt: new Date().toLocaleString('zh-CN'),
      thumbnail: captureThumbnail(),
      data: {
        tracks: tracks.map((t) => ({
          name: t.name,
          volume: t.volume,
          muted: t.muted,
          solo: t.solo,
          effects: t.effects.map((e) =>
            e ? { type: e.type, params: { ...e.params }, expanded: e.expanded } : null
          ),
        })),
      },
    };
    setPresets((prev) => [preset, ...prev]);
    setPresetName('');
    setShowPresetInput(false);
  }, [presetName, tracks]);

  const handleLoadPreset = useCallback((preset: Preset) => {
    setFadePreset(true);
    setTimeout(() => {
      const newTracks = tracks.map((t, i) => {
        const pData = preset.data.tracks[i];
        if (!pData) return t;
        return {
          ...t,
          name: pData.name,
          volume: pData.volume,
          muted: pData.muted,
          solo: pData.solo,
          effects: pData.effects,
        };
      });
      setTracks(newTracks);
      setFadePreset(false);
    }, 300);
  }, [tracks]);

  const handleCreateRoom = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    setIsCollaborating(true);
    wsClient.connect(code);
    wsClient.send({ type: 'createRoom', roomCode: code });
    setShowCollabModal(false);
  }, []);

  const handleJoinRoom = useCallback(() => {
    if (!inputRoomCode.trim()) return;
    const code = inputRoomCode.trim().toUpperCase();
    setRoomCode(code);
    setIsCollaborating(true);
    wsClient.connect(code);
    wsClient.send({ type: 'joinRoom', roomCode: code });
    setShowCollabModal(false);
    setInputRoomCode('');
  }, [inputRoomCode]);

  useEffect(() => {
    wsClient.onMessage((msg: SyncMessage) => {
      switch (msg.type) {
        case 'paramUpdate': {
          const ti = msg.trackIndex ?? 0;
          const ei = msg.effectIndex;

          setFlashingTracks((prev) => new Set(prev).add(ti));

          if (ei !== undefined) {
            setFlashingSlots((prev) => {
              const next = new Map(prev);
              const set = new Set(next.get(ti) || []);
              set.add(ei);
              next.set(ti, set);
              return next;
            });
          }

          setTimeout(() => {
            setFlashingTracks((prev) => {
              const next = new Set(prev);
              next.delete(ti);
              return next;
            });
            if (ei !== undefined) {
              setFlashingSlots((prev) => {
                const next = new Map(prev);
                const set = new Set(next.get(ti) || []);
                set.delete(ei);
                next.set(ti, set);
                return next;
              });
            }
          }, 600);

          setTracks((prevTracks) => {
            const newTracks = [...prevTracks];
            if (!newTracks[ti]) return prevTracks;

            if (ei !== undefined && msg.paramName === 'effectType') {
              const newEffects = [...newTracks[ti].effects];
              if (msg.value === null) {
                newEffects[ei] = null;
              } else {
                const effectType = msg.value as EffectType;
                newEffects[ei] = {
                  type: effectType,
                  params: { ...DEFAULT_PARAMS[effectType] },
                  expanded: true,
                };
              }
              newTracks[ti] = { ...newTracks[ti], effects: newEffects };
            } else if (ei !== undefined && msg.paramName && msg.value !== undefined) {
              const newEffects = [...newTracks[ti].effects];
              if (newEffects[ei]) {
                newEffects[ei] = {
                  ...newEffects[ei]!,
                  params: { ...(newEffects[ei]!.params as Record<string, unknown>), [msg.paramName]: msg.value },
                };
              }
              newTracks[ti] = { ...newTracks[ti], effects: newEffects };
            } else if (msg.paramName && msg.value !== undefined) {
              const key = msg.paramName as keyof Track;
              (newTracks[ti] as unknown as Record<string, unknown>)[key] = msg.value;
              if (msg.paramName === 'volume' && newTracks[ti].gainNode) {
                newTracks[ti].gainNode!.gain.value = newTracks[ti].muted ? 0 : (msg.value as number) / 100;
              }
              if (msg.paramName === 'muted' && newTracks[ti].gainNode) {
                newTracks[ti].gainNode!.gain.value = msg.value ? 0 : newTracks[ti].volume / 100;
              }
            }

            return newTracks;
          });
          break;
        }
        case 'fullSync': {
          if (msg.state) {
            const state = msg.state as {
              tracks: { name: string; volume: number; muted: boolean; solo: boolean; effects: (EffectSlot | null)[] }[];
            };
            setTracks((prev) =>
              prev.map((t, i) => {
                const s = state.tracks[i];
                if (!s) return t;
                return { ...t, name: s.name, volume: s.volume, muted: s.muted, solo: s.solo, effects: s.effects };
              })
            );
          }
          break;
        }
        case 'roomJoined': {
          wsClient.send({
            type: 'fullSync',
            state: {
              tracks: tracks.map((t) => ({
                name: t.name,
                volume: t.volume,
                muted: t.muted,
                solo: t.solo,
                effects: t.effects,
              })),
            },
          });
          break;
        }
      }
    });
  }, [tracks]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const effectType = active.data.current?.type as EffectType;
      if (!effectType) return;

      const slotId = over.id as string;
      const slotMatch = slotId.match(/^slot-(\d+)$/);
      if (!slotMatch) return;

      const slotIndex = parseInt(slotMatch[1], 10);
      const trackIdx = activeTrackIndexRef.current;

      handleEffectSlotChange(trackIdx, slotIndex, effectType);
    },
    [handleEffectSlotChange]
  );

  const getVolumeColor = (volume: number): string => {
    const ratio = volume / 100;
    const r = Math.round(ratio * 255);
    const g = Math.round((1 - ratio) * 255);
    return `rgb(${r}, ${g}, 0)`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        fontFamily: '-apple-system, sans-serif',
        color: '#e0e0e0',
        padding: '16px',
        opacity: fadePreset ? 0.5 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <style>{`
        @keyframes flashPulse {
          0% { box-shadow: 0 0 0 rgba(226,169,59,0); }
          50% { box-shadow: 0 0 12px rgba(226,169,59,0.5); }
          100% { box-shadow: 0 0 0 rgba(226,169,59,0); }
        }
        @keyframes btnPress {
          0% { transform: scale(1); }
          50% { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
        .track-flash {
          animation: flashPulse 0.6s ease;
        }
        .btn-press:active {
          animation: btnPress 0.2s ease;
        }
        .metal-brush {
          background: linear-gradient(135deg, #16213e 0%, #1a1a3e 25%, #16213e 50%, #141a35 75%, #16213e 100%);
          background-size: 200% 200%;
        }
        .volume-bar {
          transition: background-color 0.15s ease;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1a1a2e; }
        ::-webkit-scrollbar-thumb { background: rgba(226,169,59,0.3); border-radius: 3px; }
      `}</style>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          marginBottom: '16px',
          background: 'linear-gradient(90deg, #16213e 0%, #1a1a2e 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(226,169,59,0.15)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="28" height="28" viewBox="0 0 64 64">
            <rect fill="#e2a93b" x="8" y="20" width="8" height="24" rx="2" />
            <rect fill="#e2a93b" x="20" y="10" width="8" height="34" rx="2" />
            <rect fill="#e2a93b" x="32" y="16" width="8" height="28" rx="2" />
            <rect fill="#e2a93b" x="44" y="8" width="8" height="36" rx="2" />
          </svg>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#e2a93b', letterSpacing: '2px' }}>
            MIX STUDIO
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowCollabModal(true)}
            className="btn-press"
            style={{
              padding: '8px 16px',
              background: isCollaborating ? 'rgba(226,169,59,0.2)' : 'rgba(226,169,59,0.1)',
              border: `1px solid ${isCollaborating ? '#e2a93b' : 'rgba(226,169,59,0.3)'}`,
              borderRadius: '8px',
              color: '#e2a93b',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isCollaborating ? '0 0 12px rgba(226,169,59,0.2)' : 'none',
            }}
          >
            {isCollaborating ? `房间: ${roomCode}` : '协作'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 700px', minWidth: '0' }}>
          {tracks.map((track, trackIndex) => (
            <div
              key={track.id}
              className={`metal-brush ${flashingTracks.has(trackIndex) ? 'track-flash' : ''}`}
              style={{
                marginBottom: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(226,169,59,0.15)',
                padding: '16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                transition: 'all 0.3s ease',
              }}
              onClick={() => {
                activeTrackIndexRef.current = trackIndex;
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#e2a93b',
                    minWidth: '60px',
                  }}
                >
                  {track.name}
                </span>

                {!track.audioBuffer ? (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        border: '2px dashed rgba(226,169,59,0.3)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: 'rgba(226,169,59,0.5)',
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                        background: 'rgba(22,33,62,0.3)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#e2a93b';
                        e.currentTarget.style.color = '#e2a93b';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(226,169,59,0.3)';
                        e.currentTarget.style.color = 'rgba(226,169,59,0.5)';
                      }}
                    >
                      📁 上传音频文件 (WAV/MP3)
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".wav,.mp3"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, trackIndex);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        height: '48px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 4px',
                        gap: '1px',
                      }}
                    >
                      {track.waveform.map((amp, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: `${Math.max(4, amp * 100)}%`,
                            background: track.isPlaying
                              ? `linear-gradient(to top, #e2a93b, #ff9500)`
                              : 'rgba(226,169,59,0.4)',
                            borderRadius: '1px',
                            minWidth: '1px',
                            transition: 'height 0.1s ease',
                          }}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => (track.isPlaying ? stopTrack(trackIndex) : playTrack(trackIndex))}
                        className="btn-press"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: `2px solid ${track.isPlaying ? '#ff5050' : '#e2a93b'}`,
                          background: track.isPlaying ? 'rgba(255,80,80,0.15)' : 'rgba(226,169,59,0.15)',
                          color: track.isPlaying ? '#ff5050' : '#e2a93b',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: track.isPlaying
                            ? '0 0 8px rgba(255,80,80,0.3)'
                            : '0 0 8px rgba(226,169,59,0.2)',
                        }}
                      >
                        {track.isPlaying ? '■' : '▶'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {uploading && activeTrackIndexRef.current === trackIndex && (
                <div style={{ marginBottom: '8px' }}>
                  <div
                    style={{
                      height: '4px',
                      background: 'rgba(226,169,59,0.15)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${uploadProgress}%`,
                        background: 'linear-gradient(90deg, #e2a93b, #ff9500)',
                        borderRadius: '2px',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '4px',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'rgba(226,169,59,0.6)' }}>
                      上传中 {uploadProgress}%
                    </span>
                    <button
                      onClick={cancelUpload}
                      style={{
                        fontSize: '11px',
                        color: '#ff5050',
                        background: 'rgba(255,80,80,0.1)',
                        border: '1px solid rgba(255,80,80,0.3)',
                        borderRadius: '4px',
                        padding: '1px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(226,169,59,0.5)', width: '24px' }}>VOL</span>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <div
                      style={{
                        height: '6px',
                        background: 'rgba(226,169,59,0.1)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = (e.clientX - rect.left) / rect.width;
                        handleVolumeChange(trackIndex, Math.round(Math.max(0, Math.min(100, ratio * 100))));
                      }}
                    >
                      <div
                        className="volume-bar"
                        style={{
                          height: '100%',
                          width: `${track.volume}%`,
                          background: `linear-gradient(90deg, #00ff00, ${getVolumeColor(track.volume)})`,
                          borderRadius: '3px',
                          boxShadow: `0 0 6px ${getVolumeColor(track.volume)}40`,
                        }}
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#e2a93b', width: '28px', textAlign: 'right' }}>
                    {track.volume}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleMuteToggle(trackIndex)}
                    className="btn-press"
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${track.muted ? '#ff5050' : 'rgba(255,80,80,0.2)'}`,
                      background: track.muted ? 'rgba(255,80,80,0.2)' : 'rgba(255,80,80,0.05)',
                      color: track.muted ? '#ff5050' : 'rgba(255,80,80,0.5)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: track.muted ? '0 0 8px rgba(255,80,80,0.2)' : 'none',
                    }}
                  >
                    M
                  </button>
                  <button
                    onClick={() => handleSoloToggle(trackIndex)}
                    className="btn-press"
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${track.solo ? '#e2a93b' : 'rgba(226,169,59,0.2)'}`,
                      background: track.solo ? 'rgba(226,169,59,0.2)' : 'rgba(226,169,59,0.05)',
                      color: track.solo ? '#e2a93b' : 'rgba(226,169,59,0.5)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: track.solo ? '0 0 8px rgba(226,169,59,0.2)' : 'none',
                    }}
                  >
                    S
                  </button>
                </div>
              </div>

              <DndContext onDragEnd={handleDragEnd}>
                <EffectRack
                  slots={track.effects}
                  onSlotChange={(slotIndex, effectType) =>
                    handleEffectSlotChange(trackIndex, slotIndex, effectType)
                  }
                  onSlotRemove={(slotIndex) => handleEffectSlotRemove(trackIndex, slotIndex)}
                  onToggleExpand={(slotIndex) => handleEffectToggleExpand(trackIndex, slotIndex)}
                  onParamChange={(slotIndex, paramName, value) =>
                    handleEffectParamChange(trackIndex, slotIndex, paramName, value)
                  }
                  flashingSlots={flashingSlots.get(trackIndex) || new Set()}
                />
              </DndContext>
            </div>
          ))}

          {tracks.length < 4 && (
            <button
              onClick={handleAddTrack}
              className="btn-press"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px dashed rgba(226,169,59,0.2)',
                borderRadius: '12px',
                background: 'rgba(22,33,62,0.2)',
                color: 'rgba(226,169,59,0.4)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#e2a93b';
                e.currentTarget.style.color = '#e2a93b';
                e.currentTarget.style.background = 'rgba(22,33,62,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(226,169,59,0.2)';
                e.currentTarget.style.color = 'rgba(226,169,59,0.4)';
                e.currentTarget.style.background = 'rgba(22,33,62,0.2)';
              }}
            >
              + 添加音轨 ({tracks.length}/4)
            </button>
          )}
        </div>

        <div
          style={{
            width: '280px',
            flexShrink: 0,
          }}
        >
          <div
            className="metal-brush"
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(226,169,59,0.15)',
              padding: '16px',
              background: 'linear-gradient(135deg, #16213e 0%, #0f1629 100%)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#e2a93b' }}>预设方案</h2>
              <button
                onClick={() => setShowPresetInput(!showPresetInput)}
                className="btn-press"
                style={{
                  padding: '4px 12px',
                  background: 'rgba(226,169,59,0.1)',
                  border: '1px solid rgba(226,169,59,0.3)',
                  borderRadius: '6px',
                  color: '#e2a93b',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {showPresetInput ? '取消' : '+ 保存'}
              </button>
            </div>

            {showPresetInput && (
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                  placeholder="输入预设名称"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(226,169,59,0.2)',
                    borderRadius: '6px',
                    color: '#e0e0e0',
                    fontSize: '13px',
                    outline: 'none',
                    marginBottom: '8px',
                    fontFamily: '-apple-system, sans-serif',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#e2a93b';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(226,169,59,0.2)';
                  }}
                />
                <button
                  onClick={handleSavePreset}
                  className="btn-press"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(226,169,59,0.15)',
                    border: '1px solid rgba(226,169,59,0.3)',
                    borderRadius: '6px',
                    color: '#e2a93b',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  保存方案
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
              {presets.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(226,169,59,0.3)', fontSize: '12px' }}>
                  暂无预设方案
                </div>
              )}
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset)}
                  style={{
                    padding: '10px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(226,169,59,0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(226,169,59,0.3)';
                    e.currentTarget.style.background = 'rgba(226,169,59,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(226,169,59,0.1)';
                    e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                  }}
                >
                  {preset.thumbnail && (
                    <img
                      src={preset.thumbnail}
                      alt="snapshot"
                      style={{
                        width: '48px',
                        height: '28px',
                        borderRadius: '4px',
                        border: '1px solid rgba(226,169,59,0.15)',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#e2a93b',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {preset.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(226,169,59,0.4)', marginTop: '2px' }}>
                      {preset.createdAt}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPresets((prev) => prev.filter((p) => p.id !== preset.id));
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,80,80,0.4)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ff5050';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,80,80,0.4)';
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCollabModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowCollabModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#16213e',
              border: '1px solid rgba(226,169,59,0.3)',
              borderRadius: '12px',
              padding: '24px',
              width: '360px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(226,169,59,0.1)',
            }}
          >
            <h3 style={{ fontSize: '16px', color: '#e2a93b', marginBottom: '16px', fontWeight: 600 }}>
              协作混音
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={handleCreateRoom}
                className="btn-press"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(226,169,59,0.15)',
                  border: '1px solid rgba(226,169,59,0.3)',
                  borderRadius: '8px',
                  color: '#e2a93b',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '8px',
                }}
              >
                创建房间
              </button>

              {isCollaborating && roomCode && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '12px',
                    background: 'rgba(226,169,59,0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(226,169,59,0.2)',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'rgba(226,169,59,0.5)', marginBottom: '4px' }}>
                    邀请码
                  </div>
                  <div style={{ fontSize: '24px', color: '#e2a93b', fontWeight: 700, letterSpacing: '4px' }}>
                    {roomCode}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: 'rgba(226,169,59,0.15)',
                }}
              />
              <span style={{ fontSize: '11px', color: 'rgba(226,169,59,0.3)', padding: '0 8px' }}>或</span>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: 'rgba(226,169,59,0.15)',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                placeholder="输入6位邀请码"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(226,169,59,0.2)',
                  borderRadius: '8px',
                  color: '#e2a93b',
                  fontSize: '16px',
                  textAlign: 'center',
                  letterSpacing: '4px',
                  outline: 'none',
                  fontFamily: '-apple-system, sans-serif',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#e2a93b';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(226,169,59,0.2)';
                }}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              className="btn-press"
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(226,169,59,0.15)',
                border: '1px solid rgba(226,169,59,0.3)',
                borderRadius: '8px',
                color: '#e2a93b',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              加入房间
            </button>

            {isCollaborating && (
              <button
                onClick={() => {
                  wsClient.disconnect();
                  setIsCollaborating(false);
                  setRoomCode('');
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '8px',
                  background: 'rgba(255,80,80,0.1)',
                  border: '1px solid rgba(255,80,80,0.2)',
                  borderRadius: '8px',
                  color: '#ff5050',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                退出协作
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MixingConsole;
