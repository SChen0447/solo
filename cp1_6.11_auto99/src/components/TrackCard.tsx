import { useCallback } from 'react';
import { useAudioStore, type TrackState } from '@/store/audioStore';
import { audioEngine } from './AudioEngine';
import VolumeFader from './VolumeFader';
import PanKnob from './PanKnob';
import WaveModeSwitch from './WaveModeSwitch';
import AudioFingerprint from './AudioFingerprint';
import DropZone from './DropZone';
import { getFrequencyBandColor } from '@/utils/colorUtils';
import { Play, Square, X } from 'lucide-react';

interface TrackCardProps {
  track: TrackState;
  index: number;
  themeColor: string;
}

export default function TrackCard({ track, index, themeColor }: TrackCardProps) {
  const setTrackGain = useAudioStore((s) => s.setTrackGain);
  const setTrackPan = useAudioStore((s) => s.setTrackPan);
  const setTrackLoaded = useAudioStore((s) => s.setTrackLoaded);

  const dominantColor = track.loaded ? getFrequencyBandColor(track.dominantBand) : 'rgba(255,255,255,0.2)';

  const handleFile = useCallback(
    async (file: File) => {
      await audioEngine.loadAudio(index, file);
    },
    [index]
  );

  const handlePlayStop = useCallback(() => {
    if (track.playing) {
      audioEngine.stop(index);
    } else {
      audioEngine.resumeContext();
      audioEngine.start(index);
    }
  }, [track.playing, index]);

  const handleRemove = useCallback(() => {
    audioEngine.stop(index);
    setTrackLoaded(index, '', [], 'mid');
  }, [index, setTrackLoaded]);

  const handleGainChange = useCallback(
    (db: number) => {
      setTrackGain(index, db);
      audioEngine.setGain(index, db);
    },
    [index, setTrackGain]
  );

  const handlePanChange = useCallback(
    (angle: number) => {
      setTrackPan(index, angle);
      audioEngine.setPan(index, angle);
    },
    [index, setTrackPan]
  );

  return (
    <div
      className="flex flex-col items-center gap-2 p-3 rounded-lg relative"
      style={{
        background: 'linear-gradient(180deg, #16213e 0%, #0f1628 100%)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 20px rgba(0,0,0,0.3), 0 0 12px ${track.loaded ? dominantColor + '15' : 'transparent'}`,
        border: `1px solid ${track.loaded ? dominantColor + '20' : 'rgba(255,255,255,0.04)'}`,
        minWidth: 0,
      }}
    >
      <div className="flex items-center gap-1.5 w-full">
        <AudioFingerprint fingerprint={track.fingerprint} dominantBand={track.dominantBand} />
        <div className="flex-1 min-w-0">
          <div
            className="text-[10px] truncate"
            style={{
              color: track.loaded ? dominantColor : 'rgba(255,255,255,0.3)',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 600,
            }}
          >
            {track.loaded ? track.fileName : `轨道 ${index + 1}`}
          </div>
        </div>
        {track.loaded && (
          <button
            onClick={handleRemove}
            className="opacity-30 hover:opacity-70 transition-opacity"
            style={{ color: dominantColor }}
            title="移除轨道"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {!track.loaded ? (
        <DropZone onFile={handleFile} color={dominantColor || themeColor} />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <VolumeFader value={track.gain} onChange={handleGainChange} color={dominantColor} />
            <PanKnob value={track.pan} onChange={handlePanChange} color={dominantColor} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayStop}
              className="flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
              style={{
                width: 28,
                height: 28,
                background: track.playing ? dominantColor : 'rgba(255,255,255,0.06)',
                border: `1px solid ${track.playing ? dominantColor : 'rgba(255,255,255,0.1)'}`,
                color: track.playing ? '#0a0a1a' : dominantColor,
                boxShadow: track.playing ? `0 0 10px ${dominantColor}60` : 'none',
              }}
              title={track.playing ? '停止' : '播放'}
            >
              {track.playing ? <Square size={10} /> : <Play size={10} style={{ marginLeft: 1 }} />}
            </button>
            <WaveModeSwitch color={dominantColor} />
          </div>
        </>
      )}
    </div>
  );
}
