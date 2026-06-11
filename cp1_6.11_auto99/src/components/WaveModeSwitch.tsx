import { useAudioStore, type WaveMode } from '@/store/audioStore';
import { getFrequencyBandColor } from '@/utils/colorUtils';

const MODES: { key: WaveMode; label: string; icon: string }[] = [
  { key: 'bars', label: '柱状', icon: '▥' },
  { key: 'lines', label: '线条', icon: '∿' },
  { key: 'particles', label: '粒子', icon: '●' },
];

export default function WaveModeSwitch({ color }: { color: string }) {
  const waveMode = useAudioStore((s) => s.waveMode);
  const setWaveMode = useAudioStore((s) => s.setWaveMode);

  return (
    <div className="flex gap-1.5 items-center">
      {MODES.map((mode) => {
        const active = waveMode === mode.key;
        return (
          <button
            key={mode.key}
            onClick={() => setWaveMode(mode.key)}
            className="flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              width: 28,
              height: 28,
              background: active ? color : 'rgba(255,255,255,0.05)',
              border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
              color: active ? '#0a0a1a' : 'rgba(255,255,255,0.4)',
              boxShadow: active ? `0 0 8px ${color}60` : 'none',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transform: active ? 'scale(1.1)' : 'scale(1)',
            }}
            title={mode.label}
          >
            {mode.icon}
          </button>
        );
      })}
    </div>
  );
}

export function getDominantColor(band: 'low' | 'mid' | 'high'): string {
  return getFrequencyBandColor(band);
}
