import React, { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import Stage3D from './stage/Stage3D';
import ControlPanel from './ui/ControlPanel';
import SynthEngine from './audio/SynthEngine';
import { Recorder, type RecorderHandle } from './utils/recorder';
import {
  DEFAULT_STATE,
  PERFORMANCE_PRESETS,
  type GlobalState,
  type LightParams,
  type DanceParams,
  type AudioParams,
  type PresetName,
} from './types';
import './App.css';

const synthEngine = new SynthEngine();

const App: React.FC = () => {
  const [state, setState] = useState<GlobalState>(DEFAULT_STATE);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateLights = useCallback((lights: Partial<LightParams>) => {
    setState((prev) => {
      const newLights = { ...prev.lights, ...lights };
      gsap.to(prev.lights, {
        ...lights,
        duration: 0.3,
        ease: 'power2.out',
      });
      return { ...prev, lights: newLights, currentPreset: null };
    });
  }, []);

  const updateDance = useCallback((dance: Partial<DanceParams>) => {
    setState((prev) => {
      const newDance = { ...prev.dance, ...dance };
      gsap.to(prev.dance, {
        ...dance,
        duration: 0.3,
        ease: 'power2.out',
      });
      return { ...prev, dance: newDance, currentPreset: null };
    });
  }, []);

  const updateAudio = useCallback((audio: Partial<AudioParams>) => {
    setState((prev) => {
      const newAudio = { ...prev.audio, ...audio };
      if (audio.volume !== undefined) {
        synthEngine.setVolume(audio.volume);
      }
      if (audio.bpm !== undefined) {
        synthEngine.setBPM(audio.bpm);
      }
      if (audio.masterVolume !== undefined) {
        synthEngine.setMasterVolume(audio.masterVolume);
      }
      gsap.to(prev.audio, {
        ...audio,
        duration: 0.3,
        ease: 'power2.out',
      });
      return { ...prev, audio: newAudio, currentPreset: null };
    });
  }, []);

  const applyPreset = useCallback((presetName: PresetName) => {
    const preset = PERFORMANCE_PRESETS[presetName];
    if (!preset) return;

    setState((prev) => {
      const newState = {
        ...prev,
        lights: { ...prev.lights, ...preset.lights },
        dance: { ...prev.dance, ...preset.dance },
        audio: { ...prev.audio, ...preset.audio },
        currentPreset: presetName,
      };

      gsap.to(prev.lights, {
        ...preset.lights,
        duration: 0.5,
        ease: 'power2.out',
      });
      gsap.to(prev.dance, {
        ...preset.dance,
        duration: 0.5,
        ease: 'power2.out',
      });
      gsap.to(prev.audio, {
        ...preset.audio,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: function () {
          const target = this.targets()[0] as AudioParams;
          if (target.volume !== undefined) synthEngine.setVolume(target.volume);
          if (target.bpm !== undefined) synthEngine.setBPM(target.bpm);
          if (target.masterVolume !== undefined) synthEngine.setMasterVolume(target.masterVolume);
        },
      });

      return newState;
    });
  }, []);

  const startRecording = useCallback(async () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const audioStream = synthEngine.getAudioStream();
    const canvasStream = canvas.captureStream(60);

    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    recorderRef.current = Recorder.start(combinedStream, {
      onStop: (blob) => {
        Recorder.download(blob, `virtual-concert-${Date.now()}.webm`);
      },
    });

    setState((prev) => ({
      ...prev,
      recording: { isRecording: true, duration: 0 },
    }));

    recordingTimerRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        recording: {
          ...prev.recording,
          duration: prev.recording.duration + 1,
        },
      }));
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      Recorder.stop(recorderRef.current);
      recorderRef.current = null;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      recording: { ...prev.recording, isRecording: false },
    }));
  }, []);

  const toggleRecording = useCallback(() => {
    if (state.recording.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state.recording.isRecording, startRecording, stopRecording]);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  useEffect(() => {
    synthEngine.init();
    synthEngine.start();

    const updateBeat = () => {
      const beatDuration = 60000 / state.audio.bpm;
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current);
      }
      beatIntervalRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, beatTime: prev.beatTime + 1 }));
      }, beatDuration);
    };

    updateBeat();

    return () => {
      synthEngine.stop();
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recorderRef.current) {
        Recorder.stop(recorderRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const updateBeat = () => {
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current);
      }
      const beatDuration = 60000 / state.audio.bpm;
      beatIntervalRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, beatTime: prev.beatTime + 1 }));
      }, beatDuration);
    };
    updateBeat();
    return () => {
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current);
      }
    };
  }, [state.audio.bpm]);

  return (
    <div className="app-container">
      <div className="stage-area">
        <Stage3D
          lights={state.lights}
          dance={state.dance}
          beatTime={state.beatTime}
          bpm={state.audio.bpm}
          onCanvasReady={handleCanvasReady}
        />
        <div className="preset-bar">
          {(Object.keys(PERFORMANCE_PRESETS) as PresetName[]).map((key) => (
            <button
              key={key}
              className={`preset-btn ${state.currentPreset === key ? 'active' : ''}`}
              onClick={() => applyPreset(key)}
            >
              {PERFORMANCE_PRESETS[key].name}
            </button>
          ))}
        </div>
      </div>
      <div className="control-area">
        <ControlPanel
          lights={state.lights}
          dance={state.dance}
          audio={state.audio}
          recording={state.recording}
          onUpdateLights={updateLights}
          onUpdateDance={updateDance}
          onUpdateAudio={updateAudio}
          onToggleRecording={toggleRecording}
          onApplyPreset={applyPreset}
        />
      </div>
    </div>
  );
};

export default App;
