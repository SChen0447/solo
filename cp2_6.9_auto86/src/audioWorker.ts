interface SongConfig {
  id: string;
  bpm: number;
  duration: number;
  name: string;
  difficulty: number;
}

interface BeatData {
  timestamps: Float32Array;
  energy: Float32Array;
  sampleRate: number;
}

const SONGS: SongConfig[] = [
  { id: 'neon_drive', bpm: 128, duration: 60, name: 'Neon Drive', difficulty: 1 },
  { id: 'cyber_pulse', bpm: 140, duration: 75, name: 'Cyber Pulse', difficulty: 2 },
  { id: 'synthwave_rush', bpm: 160, duration: 90, name: 'Synthwave Rush', difficulty: 3 }
];

function generateBeatData(config: SongConfig): BeatData {
  const beatInterval = 60 / config.bpm;
  const totalBeats = Math.floor(config.duration / beatInterval);
  const timestamps = new Float32Array(totalBeats);
  const energy = new Float32Array(totalBeats);

  for (let i = 0; i < totalBeats; i++) {
    timestamps[i] = i * beatInterval;
    const baseEnergy = 0.4 + 0.3 * Math.sin(i * 0.1) + 0.2 * Math.sin(i * 0.37);
    const accent = (i % 4 === 0) ? 0.15 : 0;
    energy[i] = Math.min(1, Math.max(0.1, baseEnergy + accent + (Math.random() - 0.5) * 0.1));
  }

  return {
    timestamps,
    energy,
    sampleRate: 44100
  };
}

self.onmessage = (e: MessageEvent) => {
  const { type, songId } = e.data;

  if (type === 'analyze') {
    const song = SONGS.find(s => s.id === songId) || SONGS[0];
    const beatData = generateBeatData(song);

    self.postMessage({
      type: 'result',
      songId,
      timestamps: Array.from(beatData.timestamps),
      energy: Array.from(beatData.energy),
      duration: song.duration,
      bpm: song.bpm
    });
  } else if (type === 'getSongs') {
    self.postMessage({
      type: 'songs',
      songs: SONGS.map(s => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        difficulty: s.difficulty
      }))
    });
  }
};

export {};
