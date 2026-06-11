import React, { useEffect, useRef } from 'react';
import { Pane, FolderApi, ButtonApi } from 'tweakpane';
import { gsap } from 'gsap';
import type { LightParams, DanceParams, AudioParams, RecordingState, PresetName } from '../types';
import { LIGHT_PRESETS, PERFORMANCE_PRESETS } from '../types';

interface ControlPanelProps {
  lights: LightParams;
  dance: DanceParams;
  audio: AudioParams;
  recording: RecordingState;
  onUpdateLights: (lights: Partial<LightParams>) => void;
  onUpdateDance: (dance: Partial<DanceParams>) => void;
  onUpdateAudio: (audio: Partial<AudioParams>) => void;
  onToggleRecording: () => void;
  onApplyPreset: (preset: PresetName) => void;
}

interface TweakpaneParams {
  lightPreset: string;
  mainColor: string;
  mainIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  spotAngle: number;
  wave: number;
  spin: number;
  jump: number;
  lean: number;
  volume: number;
  bpm: number;
  masterVolume: number;
  recording: boolean;
}

interface PaneBindings {
  lightFolder: FolderApi;
  danceFolder: FolderApi;
  audioFolder: FolderApi;
  presetFolder: FolderApi;
  recordFolder: FolderApi;
  recordingButton: ButtonApi;
  lightPresetBinding: any;
  mainColorBinding: any;
  mainIntensityBinding: any;
  ambientColorBinding: any;
  ambientIntensityBinding: any;
  spotAngleBinding: any;
  waveBinding: any;
  spinBinding: any;
  jumpBinding: any;
  leanBinding: any;
  bpmBinding: any;
  volumeBinding: any;
  masterVolumeBinding: any;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  lights,
  dance,
  audio,
  recording,
  onUpdateLights,
  onUpdateDance,
  onUpdateAudio,
  onToggleRecording,
  onApplyPreset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<Pane | null>(null);
  const bindingsRef = useRef<PaneBindings | null>(null);
  const paramsRef = useRef<TweakpaneParams>({
    lightPreset: lights.preset,
    mainColor: lights.mainColor,
    mainIntensity: lights.mainIntensity,
    ambientColor: lights.ambientColor,
    ambientIntensity: lights.ambientIntensity,
    spotAngle: lights.spotAngle,
    wave: dance.wave,
    spin: dance.spin,
    jump: dance.jump,
    lean: dance.lean,
    volume: audio.volume,
    bpm: audio.bpm,
    masterVolume: audio.masterVolume,
    recording: recording.isRecording,
  });

  useEffect(() => {
    if (!containerRef.current || paneRef.current) return;

    const pane = new Pane({
      title: '🎤 演唱会控制台',
      container: containerRef.current,
    });

    const style = document.createElement('style');
    style.textContent = `
      .tp-dfwv {
        width: 100% !important;
        max-width: none !important;
      }
      .tp-lblv {
        color: rgba(255, 255, 255, 0.9) !important;
      }
      .tp-sld {
        background: linear-gradient(90deg, #00d4ff, #a855f7) !important;
        height: 6px !important;
        border-radius: 3px !important;
      }
      .tp-sld_g {
        background: transparent !important;
      }
      .tp-sld_b {
        background: rgba(255, 255, 255, 0.9) !important;
        box-shadow: 0 0 8px rgba(0, 212, 255, 0.6) !important;
      }
      .tp-rotv {
        color: rgba(255, 255, 255, 0.9) !important;
      }
      .tp-lblv_v {
        color: rgba(255, 255, 255, 0.7) !important;
      }
      .tp-btn {
        background: linear-gradient(135deg, #00d4ff, #a855f7) !important;
        border: none !important;
        color: white !important;
        font-weight: 600 !important;
        transition: all 0.3s ease !important;
      }
      .tp-btn:hover {
        transform: scale(1.02) !important;
        box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4) !important;
      }
      .tp-btn:active {
        transform: scale(0.98) !important;
      }
      .tp-fld {
        background: rgba(0, 0, 0, 0.2) !important;
      }
      .tp-lbl {
        color: rgba(255, 255, 255, 0.9) !important;
      }
      .tp-txtv_i {
        color: rgba(255, 255, 255, 0.9) !important;
      }
      .tp-pdv {
        background: rgba(255, 255, 255, 0.05) !important;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.02); }
      }
    `;
    document.head.appendChild(style);

    const params = paramsRef.current;

    const lightFolder = pane.addBlade({
      view: 'folder',
      label: '💡 灯光系统',
      expanded: true,
    }) as unknown as FolderApi;

    const lightPresetBinding = lightFolder.addBlade({
      view: 'list',
      label: '预设',
      options: [
        { text: '暖色聚光灯', value: 'warm' },
        { text: '冷色氛围灯', value: 'cool' },
        { text: '彩色迪斯科', value: 'disco' },
      ],
      value: params.lightPreset,
    });

    lightPresetBinding.on('change', (ev: { value: unknown }) => {
      const presetKey = ev.value as string;
      const preset = LIGHT_PRESETS[presetKey];
      if (preset) {
        paramsRef.current.mainColor = preset.mainColor!;
        paramsRef.current.ambientColor = preset.ambientColor!;
        paramsRef.current.mainIntensity = preset.mainIntensity!;
        paramsRef.current.ambientIntensity = preset.ambientIntensity!;
        paramsRef.current.spotAngle = preset.spotAngle!;
        paramsRef.current.lightPreset = presetKey;

        if (bindingsRef.current) {
          bindingsRef.current.mainColorBinding.refresh();
          bindingsRef.current.ambientColorBinding.refresh();
          bindingsRef.current.mainIntensityBinding.refresh();
          bindingsRef.current.ambientIntensityBinding.refresh();
          bindingsRef.current.spotAngleBinding.refresh();
        }

        onUpdateLights({ ...preset, preset: presetKey as LightParams['preset'] });
      }
    });

    const mainColorBinding = lightFolder.addBinding(params, 'mainColor', {
      label: '主光颜色',
      picker: 'inline',
      expanded: false,
    });

    mainColorBinding.on('change', (ev: { value: unknown }) => {
      onUpdateLights({ mainColor: ev.value as string });
    });

    const mainIntensityBinding = lightFolder.addBinding(params, 'mainIntensity', {
      label: '主光强度',
      min: 0,
      max: 5,
      step: 0.1,
    });

    mainIntensityBinding.on('change', (ev: { value: unknown }) => {
      onUpdateLights({ mainIntensity: ev.value as number });
    });

    const ambientColorBinding = lightFolder.addBinding(params, 'ambientColor', {
      label: '环境色',
      picker: 'inline',
      expanded: false,
    });

    ambientColorBinding.on('change', (ev: { value: unknown }) => {
      onUpdateLights({ ambientColor: ev.value as string });
    });

    const ambientIntensityBinding = lightFolder.addBinding(params, 'ambientIntensity', {
      label: '环境强度',
      min: 0,
      max: 2,
      step: 0.05,
    });

    ambientIntensityBinding.on('change', (ev: { value: unknown }) => {
      onUpdateLights({ ambientIntensity: ev.value as number });
    });

    const spotAngleBinding = lightFolder.addBinding(params, 'spotAngle', {
      label: '聚光角度',
      min: 0.1,
      max: 1,
      step: 0.05,
    });

    spotAngleBinding.on('change', (ev: { value: unknown }) => {
      onUpdateLights({ spotAngle: ev.value as number });
    });

    const danceFolder = pane.addBlade({
      view: 'folder',
      label: '💃 舞蹈动作',
      expanded: true,
    }) as unknown as FolderApi;

    const waveBinding = danceFolder.addBinding(params, 'wave', {
      label: '挥手',
      min: 0,
      max: 1,
      step: 0.01,
    });

    waveBinding.on('change', (ev: { value: unknown }) => {
      onUpdateDance({ wave: ev.value as number });
    });

    const spinBinding = danceFolder.addBinding(params, 'spin', {
      label: '旋转',
      min: 0,
      max: 1,
      step: 0.01,
    });

    spinBinding.on('change', (ev: { value: unknown }) => {
      onUpdateDance({ spin: ev.value as number });
    });

    const jumpBinding = danceFolder.addBinding(params, 'jump', {
      label: '跳跃',
      min: 0,
      max: 1,
      step: 0.01,
    });

    jumpBinding.on('change', (ev: { value: unknown }) => {
      onUpdateDance({ jump: ev.value as number });
    });

    const leanBinding = danceFolder.addBinding(params, 'lean', {
      label: '侧身',
      min: 0,
      max: 1,
      step: 0.01,
    });

    leanBinding.on('change', (ev: { value: unknown }) => {
      onUpdateDance({ lean: ev.value as number });
    });

    const audioFolder = pane.addBlade({
      view: 'folder',
      label: '🎵 音频控制',
      expanded: true,
    }) as unknown as FolderApi;

    const bpmBinding = audioFolder.addBinding(params, 'bpm', {
      label: 'BPM',
      min: 80,
      max: 160,
      step: 1,
    });

    bpmBinding.on('change', (ev: { value: unknown }) => {
      onUpdateAudio({ bpm: ev.value as number });
    });

    const volumeBinding = audioFolder.addBinding(params, 'volume', {
      label: '主旋律音量',
      min: 0,
      max: 1,
      step: 0.01,
    });

    volumeBinding.on('change', (ev: { value: unknown }) => {
      onUpdateAudio({ volume: ev.value as number });
    });

    const masterVolumeBinding = audioFolder.addBinding(params, 'masterVolume', {
      label: '总音量',
      min: 0,
      max: 1,
      step: 0.01,
    });

    masterVolumeBinding.on('change', (ev: { value: unknown }) => {
      onUpdateAudio({ masterVolume: ev.value as number });
    });

    const presetFolder = pane.addBlade({
      view: 'folder',
      label: '🎬 演出预设',
      expanded: true,
    }) as unknown as FolderApi;

    presetFolder.addButton({
      title: `🎼 ${PERFORMANCE_PRESETS.lyrical.name}`,
    }).on('click', () => {
      onApplyPreset('lyrical');
    });

    presetFolder.addButton({
      title: `💥 ${PERFORMANCE_PRESETS.dance.name}`,
    }).on('click', () => {
      onApplyPreset('dance');
    });

    presetFolder.addButton({
      title: `🌌 ${PERFORMANCE_PRESETS.electronic.name}`,
    }).on('click', () => {
      onApplyPreset('electronic');
    });

    const recordFolder = pane.addBlade({
      view: 'folder',
      label: '📹 录制功能',
      expanded: true,
    }) as unknown as FolderApi;

    const recordingButton = recordFolder.addButton({
      title: recording.isRecording ? '⏹ 停止录制' : '⏺ 开始录制',
    });

    const updateRecordButton = (isRecording: boolean, duration?: number) => {
      const btnElement = recordingButton.element.querySelector('button');
      if (btnElement) {
        if (isRecording) {
          const mins = Math.floor((duration || 0) / 60);
          const secs = (duration || 0) % 60;
          btnElement.innerHTML = `<span style="color: #ef4444;">⏹ 停止录制 ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</span>`;
          btnElement.style.background = 'linear-gradient(135deg, #ef4444, #dc2626) !important';
          btnElement.style.animation = 'pulse 1s ease-in-out infinite';
        } else {
          btnElement.innerHTML = '⏺ 开始录制';
          btnElement.style.background = 'linear-gradient(135deg, #6b7280, #4b5563) !important';
          btnElement.style.animation = 'none';
        }
      }
    };

    recordingButton.on('click', () => {
      onToggleRecording();
    });

    bindingsRef.current = {
      lightFolder,
      danceFolder,
      audioFolder,
      presetFolder,
      recordFolder,
      recordingButton,
      lightPresetBinding,
      mainColorBinding,
      mainIntensityBinding,
      ambientColorBinding,
      ambientIntensityBinding,
      spotAngleBinding,
      waveBinding,
      spinBinding,
      jumpBinding,
      leanBinding,
      bpmBinding,
      volumeBinding,
      masterVolumeBinding,
    };

    paneRef.current = pane;
    (pane as any)._updateRecordButton = updateRecordButton;

    return () => {
      if (paneRef.current) {
        paneRef.current.dispose();
        paneRef.current = null;
        bindingsRef.current = null;
      }
    };
  }, [onUpdateLights, onUpdateDance, onUpdateAudio, onToggleRecording, onApplyPreset, lights.preset]);

  useEffect(() => {
    if (paneRef.current) {
      const updateFn = (paneRef.current as any)._updateRecordButton;
      if (updateFn) {
        updateFn(recording.isRecording, recording.duration);
      }
    }
  }, [recording.isRecording, recording.duration]);

  useEffect(() => {
    if (!paneRef.current || !bindingsRef.current) return;

    const params = paramsRef.current;
    const bindings = bindingsRef.current;

    gsap.to(params, {
      mainIntensity: lights.mainIntensity,
      ambientIntensity: lights.ambientIntensity,
      spotAngle: lights.spotAngle,
      wave: dance.wave,
      spin: dance.spin,
      jump: dance.jump,
      lean: dance.lean,
      volume: audio.volume,
      bpm: audio.bpm,
      masterVolume: audio.masterVolume,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        bindings.mainIntensityBinding.refresh();
        bindings.ambientIntensityBinding.refresh();
        bindings.spotAngleBinding.refresh();
        bindings.waveBinding.refresh();
        bindings.spinBinding.refresh();
        bindings.jumpBinding.refresh();
        bindings.leanBinding.refresh();
        bindings.volumeBinding.refresh();
        bindings.bpmBinding.refresh();
        bindings.masterVolumeBinding.refresh();
      },
    });

    if (params.mainColor !== lights.mainColor) {
      params.mainColor = lights.mainColor;
      bindings.mainColorBinding.refresh();
    }
    if (params.ambientColor !== lights.ambientColor) {
      params.ambientColor = lights.ambientColor;
      bindings.ambientColorBinding.refresh();
    }
    if (params.lightPreset !== lights.preset) {
      params.lightPreset = lights.preset;
      bindings.lightPresetBinding.refresh();
    }
  }, [lights, dance, audio]);

  return (
    <div className="control-panel-wrapper">
      {recording.isRecording && (
        <div className="recording-indicator">
          <span className="recording-dot"></span>
          <span>
            录制中 {Math.floor(recording.duration / 60)
              .toString()
              .padStart(2, '0')}
            :{(recording.duration % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}
      <div ref={containerRef}></div>
    </div>
  );
};

export default ControlPanel;
