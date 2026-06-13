import { useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import WaveformDisplay from './components/WaveformDisplay';

export type WaveformType = 'sine' | 'sawtooth' | 'square';

function App() {
  const [waveform, setWaveform] = useState<WaveformType>('sine');
  const [frequency, setFrequency] = useState(440);
  const [cutoff, setCutoff] = useState(5000);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleWaveformChange = useCallback((w: WaveformType) => {
    setWaveform(w);
  }, []);

  const handleFrequencyChange = useCallback((f: number) => {
    setFrequency(f);
  }, []);

  const handleCutoffChange = useCallback((c: number) => {
    setCutoff(c);
  }, []);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Synth Visualizer</h1>
      <div style={styles.content}>
        <ControlPanel
          waveform={waveform}
          frequency={frequency}
          cutoff={cutoff}
          isPlaying={isPlaying}
          onWaveformChange={handleWaveformChange}
          onFrequencyChange={handleFrequencyChange}
          onCutoffChange={handleCutoffChange}
          onPlayingChange={handlePlayingChange}
        />
        <WaveformDisplay
          waveform={waveform}
          frequency={frequency}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    minHeight: '100vh',
    background: '#0f0f23',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    gap: '32px'
  },
  title: {
    color: '#ffffff',
    fontWeight: 300,
    fontSize: '28px',
    letterSpacing: '4px'
  },
  content: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '32px',
    flexWrap: 'wrap'
  }
};

export default App;
