export interface EffectChain {
  input: AudioNode;
  output: AudioNode;
  analyser: AnalyserNode;
}

interface InternalEffectNodes {
  lowpassFilter: BiquadFilterNode;
  reverbConvolver: ConvolverNode;
  reverbWet: GainNode;
  reverbDry: GainNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  delayDry: GainNode;
  analyser: AnalyserNode;
  outputGain: GainNode;
}

export type SyncMode = 'quarter' | 'eighth' | 'off';

const BPM = 120;

function generateImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function getDelayTime(syncMode: SyncMode): number {
  const secondsPerBeat = 60 / BPM;
  switch (syncMode) {
    case 'quarter':
      return secondsPerBeat;
    case 'eighth':
      return secondsPerBeat / 2;
    case 'off':
      return 0.3;
    default:
      return 0.3;
  }
}

export function createEffectChain(ctx: AudioContext, source: AudioNode): EffectChain {
  const lowpassFilter = ctx.createBiquadFilter();
  lowpassFilter.type = 'lowpass';
  lowpassFilter.frequency.value = 10000;
  lowpassFilter.Q.value = 1;

  const reverbConvolver = ctx.createConvolver();
  reverbConvolver.buffer = generateImpulseResponse(ctx, 2.5, 2);

  const reverbWet = ctx.createGain();
  reverbWet.gain.value = 0.5;
  const reverbDry = ctx.createGain();
  reverbDry.gain.value = 0.5;

  const delayNode = ctx.createDelay(2);
  delayNode.delayTime.value = getDelayTime('quarter');
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.4;
  const delayWet = ctx.createGain();
  delayWet.gain.value = 0.4;
  const delayDry = ctx.createGain();
  delayDry.gain.value = 1;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.6;

  const outputGain = ctx.createGain();
  outputGain.gain.value = 1;

  source.connect(lowpassFilter);

  lowpassFilter.connect(reverbDry);
  lowpassFilter.connect(reverbConvolver);
  reverbConvolver.connect(reverbWet);

  reverbDry.connect(delayDry);
  reverbWet.connect(delayDry);
  reverbDry.connect(delayNode);
  reverbWet.connect(delayNode);

  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(delayWet);

  delayDry.connect(outputGain);
  delayWet.connect(outputGain);

  outputGain.connect(analyser);
  analyser.connect(ctx.destination);

  return {
    input: source,
    output: outputGain,
    analyser,
  };
}

export function setLowpass(
  nodes: { lowpassFilter?: BiquadFilterNode },
  frequency: number,
): void {
  if (nodes.lowpassFilter) {
    nodes.lowpassFilter.frequency.setTargetAtTime(
      Math.max(200, Math.min(20000, frequency)),
      nodes.lowpassFilter.context.currentTime,
      0.01,
    );
  }
}

export function setReverb(
  nodes: { reverbWet?: GainNode; reverbDry?: GainNode },
  mix: number,
): void {
  const clampedMix = Math.max(0, Math.min(1, mix));
  const wetGain = clampedMix;
  const dryGain = 1 - clampedMix * 0.5;
  if (nodes.reverbWet) {
    nodes.reverbWet.gain.setTargetAtTime(wetGain, nodes.reverbWet.context.currentTime, 0.02);
  }
  if (nodes.reverbDry) {
    nodes.reverbDry.gain.setTargetAtTime(dryGain, nodes.reverbDry.context.currentTime, 0.02);
  }
}

export function setDelay(
  nodes: { delayFeedback?: GainNode; delayNode?: DelayNode },
  feedback: number,
  syncMode: SyncMode = 'quarter',
): void {
  const clampedFeedback = Math.max(0, Math.min(0.95, feedback));
  if (nodes.delayFeedback) {
    nodes.delayFeedback.gain.setTargetAtTime(
      clampedFeedback,
      nodes.delayFeedback.context.currentTime,
      0.02,
    );
  }
  if (nodes.delayNode) {
    nodes.delayNode.delayTime.setTargetAtTime(
      getDelayTime(syncMode),
      nodes.delayNode.context.currentTime,
      0.02,
    );
  }
}

export function createLowpassFilter(ctx: AudioContext): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 10000;
  filter.Q.value = 1;
  return filter;
}

export function createReverbNode(ctx: AudioContext): { convolver: ConvolverNode; wet: GainNode; dry: GainNode } {
  const convolver = ctx.createConvolver();
  convolver.buffer = generateImpulseResponse(ctx, 2.5, 2);
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  const dry = ctx.createGain();
  dry.gain.value = 0.5;
  return { convolver, wet, dry };
}

export function createDelayNode(ctx: AudioContext): { delay: DelayNode; feedback: GainNode; wet: GainNode; dry: GainNode } {
  const delay = ctx.createDelay(2);
  delay.delayTime.value = getDelayTime('quarter');
  const feedback = ctx.createGain();
  feedback.gain.value = 0.4;
  const wet = ctx.createGain();
  wet.gain.value = 0.4;
  const dry = ctx.createGain();
  dry.gain.value = 1;
  return { delay, feedback, wet, dry };
}

export function applyDelayFeedbackSetting(
  feedbackNode: GainNode,
  value: number,
): void {
  const clamped = Math.max(0, Math.min(0.95, value));
  feedbackNode.gain.setTargetAtTime(clamped, feedbackNode.context.currentTime, 0.02);
}

export function applyDelaySyncSetting(
  delayNode: DelayNode,
  syncMode: SyncMode,
): void {
  delayNode.delayTime.setTargetAtTime(getDelayTime(syncMode), delayNode.context.currentTime, 0.02);
}
