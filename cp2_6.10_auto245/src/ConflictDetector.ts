export interface Track {
  id: string;
  name: string;
  color: string;
  volume: number;
  startFreq: number;
  endFreq: number;
  peakEnergy: number;
  waveformData: number[];
}

export interface ConflictWarning {
  id: string;
  track1Id: string;
  track2Id: string;
  overlapStart: number;
  overlapEnd: number;
  totalEnergy: number;
  suggestion: string;
}

const CONFLICT_THRESHOLD = 6;

const getBandName = (freq: number): string => {
  if (freq < 250) return '低频';
  if (freq < 2000) return '中低频';
  if (freq < 8000) return '中高频';
  return '高频';
};

const formatFreq = (freq: number): string => {
  if (freq >= 1000) {
    return (freq / 1000).toFixed(1) + 'kHz';
  }
  return freq + 'Hz';
};

class ConflictDetector {
  private lastCheckTime = 0;
  private checkInterval = 100;
  private cachedWarnings: ConflictWarning[] = [];

  detect(tracks: Track[]): ConflictWarning[] {
    const now = Date.now();
    if (now - this.lastCheckTime < this.checkInterval) {
      return this.cachedWarnings;
    }
    this.lastCheckTime = now;

    const warnings: ConflictWarning[] = [];

    for (let i = 0; i < tracks.length; i++) {
      for (let j = i + 1; j < tracks.length; j++) {
        const t1 = tracks[i];
        const t2 = tracks[j];

        const overlapStart = Math.max(t1.startFreq, t2.startFreq);
        const overlapEnd = Math.min(t1.endFreq, t2.endFreq);

        if (overlapStart >= overlapEnd) continue;

        const overlapRatio = (overlapEnd - overlapStart) / Math.min(t1.endFreq - t1.startFreq, t2.endFreq - t2.startFreq);
        const totalEnergy = (t1.peakEnergy + t2.peakEnergy) * overlapRatio;

        if (totalEnergy > CONFLICT_THRESHOLD) {
          const bandName = getBandName((overlapStart + overlapEnd) / 2);
          const louderTrack = t1.peakEnergy >= t2.peakEnergy ? t2 : t1;

          warnings.push({
            id: `${t1.id}-${t2.id}`,
            track1Id: t1.id,
            track2Id: t2.id,
            overlapStart,
            overlapEnd,
            totalEnergy,
            suggestion: `${t1.name}与${t2.name}在${bandName}重叠，建议衰减${louderTrack.name}${formatFreq(overlapStart)}-${formatFreq(overlapEnd)}频段约${Math.min(6, Math.round(totalEnergy - CONFLICT_THRESHOLD + 2))}dB`
          });
        }
      }
    }

    this.cachedWarnings = warnings;
    return warnings;
  }
}

export default ConflictDetector;
