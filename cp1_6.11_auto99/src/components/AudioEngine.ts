import { calculateBandEnergy, generateFingerprint, dbToGain } from '@/utils/audioUtils';
import { useAudioStore } from '@/store/audioStore';

interface TrackNodeChain {
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  analyser: AnalyserNode;
  buffer: AudioBuffer | null;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private tracks: TrackNodeChain[] = [];
  private masterGain: GainNode | null = null;
  private frequencyDataArrays: Uint8Array[] = [];
  private sampleRate: number = 44100;

  async init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.sampleRate = this.ctx.sampleRate;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = useAudioStore.getState().masterVolume;
    this.masterGain.connect(this.ctx.destination);

    for (let i = 0; i < 4; i++) {
      const gainNode = this.ctx.createGain();
      gainNode.gain.value = dbToGain(-6);

      const panNode = this.ctx.createStereoPanner();
      panNode.pan.value = 0;

      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      gainNode.connect(panNode);
      panNode.connect(analyser);
      analyser.connect(this.masterGain);

      this.tracks.push({
        source: null,
        gainNode,
        panNode,
        analyser,
        buffer: null,
      });

      this.frequencyDataArrays.push(new Uint8Array(analyser.frequencyBinCount));
    }
  }

  async loadAudio(trackIndex: number, file: File): Promise<void> {
    await this.init();
    if (!this.ctx) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    this.tracks[trackIndex].buffer = audioBuffer;

    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.min(audioBuffer.sampleRate * 3, audioBuffer.length),
      audioBuffer.sampleRate
    );
    const offSource = offlineCtx.createBufferSource();
    offSource.buffer = audioBuffer;
    const offAnalyser = offlineCtx.createAnalyser();
    offAnalyser.fftSize = 256;
    offSource.connect(offAnalyser);
    offAnalyser.connect(offlineCtx.destination);
    offSource.start(0);
    const offBuffer = await offlineCtx.startRendering();

    const offData = new Uint8Array(offAnalyser.frequencyBinCount);
    const tempCtx = new OfflineAudioContext(1, 1, audioBuffer.sampleRate);
    const tempAnalyser = tempCtx.createAnalyser();
    tempAnalyser.fftSize = 256;
    const tempSource = tempCtx.createBufferSource();
    tempSource.buffer = offBuffer;
    tempSource.connect(tempAnalyser);
    tempAnalyser.getByteFrequencyData(offData);

    const fingerprint = generateFingerprint(offData);
    const energy = calculateBandEnergy(offData, audioBuffer.sampleRate);

    let dominantBand: 'low' | 'mid' | 'high' = 'mid';
    if (energy.low >= energy.mid && energy.low >= energy.high) dominantBand = 'low';
    else if (energy.high >= energy.mid) dominantBand = 'high';

    useAudioStore.getState().setTrackLoaded(trackIndex, file.name, fingerprint, dominantBand);
  }

  start(trackIndex: number) {
    if (!this.ctx || !this.tracks[trackIndex].buffer) return;

    this.stop(trackIndex);

    const source = this.ctx.createBufferSource();
    source.buffer = this.tracks[trackIndex].buffer;
    source.loop = true;
    source.connect(this.tracks[trackIndex].gainNode);
    source.start(0);

    this.tracks[trackIndex].source = source;
    useAudioStore.getState().setTrackPlaying(trackIndex, true);
  }

  stop(trackIndex: number) {
    const track = this.tracks[trackIndex];
    if (track.source) {
      try {
        track.source.stop();
      } catch {
        // source may already be stopped
      }
      track.source.disconnect();
      track.source = null;
    }
    useAudioStore.getState().setTrackPlaying(trackIndex, false);
  }

  setGain(trackIndex: number, db: number) {
    const track = this.tracks[trackIndex];
    if (!track) return;
    const gainVal = dbToGain(db);
    track.gainNode.gain.setTargetAtTime(gainVal, this.ctx?.currentTime ?? 0, 0.01);
  }

  setPan(trackIndex: number, angle: number) {
    const track = this.tracks[trackIndex];
    if (!track) return;
    const panVal = angle / 90;
    track.panNode.pan.setTargetAtTime(panVal, this.ctx?.currentTime ?? 0, 0.01);
  }

  setMasterVolume(vol: number) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx?.currentTime ?? 0, 0.01);
    }
  }

  getFrequencyData(trackIndex: number): Uint8Array {
    const track = this.tracks[trackIndex];
    if (!track) return new Uint8Array(128);
    track.analyser.getByteFrequencyData(this.frequencyDataArrays[trackIndex]);
    return this.frequencyDataArrays[trackIndex];
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  async resumeContext() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }
}

export const audioEngine = new AudioEngine();
