import { useCallback } from 'react';
import { useAudioStore } from '@/store/audioStore';
import { audioEngine } from './AudioEngine';
import TrackCard from './TrackCard';
import { Play, Pause } from 'lucide-react';

export default function ControlPanel() {
  const tracks = useAudioStore((s) => s.tracks);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const setGlobalPlaying = useAudioStore((s) => s.setGlobalPlaying);
  const themeColors = useAudioStore((s) => s.themeColors);

  const handleGlobalPlayPause = useCallback(async () => {
    await audioEngine.resumeContext();
    if (isPlaying) {
      for (let i = 0; i < 4; i++) {
        if (tracks[i].playing) audioEngine.stop(i);
      }
      setGlobalPlaying(false);
    } else {
      for (let i = 0; i < 4; i++) {
        if (tracks[i].loaded) audioEngine.start(i);
      }
      setGlobalPlaying(true);
    }
  }, [isPlaying, tracks, setGlobalPlaying]);

  const hasAnyLoaded = tracks.some((t) => t.loaded);

  return (
    <div
      className="relative flex flex-col"
      style={{
        height: '100%',
        background: '#1a1a2e',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 2,
          background: `linear-gradient(90deg, transparent, ${themeColors.primary}, ${themeColors.secondary}, transparent)`,
          boxShadow: `0 0 8px ${themeColors.primary}40`,
        }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 1,
          background: 'rgba(255,255,255,0.1)',
        }}
      />

      <div className="flex-1 flex items-stretch gap-2 p-3 pt-4">
        {tracks.map((track, i) => (
          <div key={track.id} className="flex-1 min-w-0">
            <TrackCard track={track} index={i} themeColor={themeColors.primary} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 pb-3">
        <button
          onClick={handleGlobalPlayPause}
          disabled={!hasAnyLoaded}
          className="flex items-center gap-2 px-5 py-1.5 rounded-full transition-all duration-200"
          style={{
            background: hasAnyLoaded
              ? isPlaying
                ? 'rgba(255,255,255,0.08)'
                : themeColors.primary
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${hasAnyLoaded ? themeColors.primary + '60' : 'rgba(255,255,255,0.05)'}`,
            color: hasAnyLoaded ? (isPlaying ? themeColors.primary : '#0a0a1a') : 'rgba(255,255,255,0.15)',
            boxShadow: hasAnyLoaded && !isPlaying ? `0 0 16px ${themeColors.primary}40` : 'none',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            cursor: hasAnyLoaded ? 'pointer' : 'not-allowed',
            opacity: hasAnyLoaded ? 1 : 0.5,
          }}
          title={isPlaying ? '全局暂停' : '全局播放'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 1 }} />}
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
      </div>
    </div>
  );
}
