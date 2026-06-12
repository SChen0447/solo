import { useState, useCallback } from 'react';
import BeatRing from './components/BeatRing';
import ControlPanel from './components/ControlPanel';

export type RhythmMode = 'pop' | 'rock' | 'jazz';

export interface RhythmConfig {
  name: string;
  bpm: number;
  beatsPerMeasure: number;
}

export const RHYTHM_MODES: Record<RhythmMode, RhythmConfig> = {
  pop: { name: '流行', bpm: 120, beatsPerMeasure: 4 },
  rock: { name: '摇滚', bpm: 140, beatsPerMeasure: 4 },
  jazz: { name: '爵士', bpm: 90, beatsPerMeasure: 3 }
};

function App() {
  const [mode, setMode] = useState<RhythmMode>('pop');
  const [currentBeat, setCurrentBeat] = useState(0);
  const [progress, setProgress] = useState(0);

  const config = RHYTHM_MODES[mode];

  const handleBeat = useCallback((beat: number, prog: number) => {
    setCurrentBeat(beat);
    setProgress(prog);
  }, []);

  const handleModeChange = useCallback((newMode: RhythmMode) => {
    setMode(newMode);
    setCurrentBeat(0);
    setProgress(0);
  }, []);

  return (
    <div className="app-container">
      <ControlPanel
        mode={mode}
        config={config}
        currentBeat={currentBeat}
        progress={progress}
        onModeChange={handleModeChange}
      />
      <BeatRing
        bpm={config.bpm}
        beatsPerMeasure={config.beatsPerMeasure}
        onBeat={handleBeat}
      />
    </div>
  );
}

export default App;
