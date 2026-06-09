## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "main.ts"
    "main.ts" --> "ScoreRenderer.ts"
    "main.ts" --> "PianoKeyboard.ts"
    "main.ts" --> "AudioEngine.ts"
    "ScoreRenderer.ts" --> "乐谱数据(内存)"
    "PianoKeyboard.ts" --> "AudioEngine.ts"
    "main.ts" --> "UI事件监听"
```

## 2. 技术说明
- 前端：TypeScript + Vite@5 + 原生Web Audio API + Canvas 2D
- 无第三方音频库，全部使用原生Web Audio API实现
- 构建工具：Vite 5，开启严格模式，输出目录dist
- TypeScript严格模式，目标ES2022，模块ESNext
- 所有乐谱数据预加载在内存中，无运行时文件I/O

## 3. 项目文件结构
| 文件路径 | 职责说明 |
|---------|---------|
| package.json | 项目依赖和脚本配置 |
| index.html | 入口页面，包含五线谱div、琴键div、工具栏div骨架 |
| tsconfig.json | TypeScript配置 |
| vite.config.js | Vite构建配置 |
| src/main.ts | 主入口，初始化所有模块、事件监听、准确率计算、导出startApp/stopApp |
| src/AudioEngine.ts | Web Audio上下文管理，playNote/setVolume/stopAll封装，高精度时间调度 |
| src/ScoreRenderer.ts | Canvas绘制五线谱、音符、光标，requestAnimationFrame驱动动画，音符高亮逻辑 |
| src/PianoKeyboard.ts | 渲染13白键+9黑键，鼠标/触摸事件绑定，按键动画，highlightKey方法 |

## 4. 核心数据结构

### 4.1 乐谱音符数据
```typescript
interface ScoreNote {
  pitch: string;      // 音高，如 "C4", "D4"
  midi: number;       // MIDI音符号 (60=C4)
  frequency: number;  // 频率Hz
  startBeat: number;  // 起始拍数
  duration: number;   // 持续拍数
  staffLine: number;  // 五线谱线间位置 (0=第一线，1=第一间...)
}

interface Score {
  title: string;
  bpm: number;
  notes: ScoreNote[];
  totalBeats: number;
}
```

### 4.2 音频引擎接口
```typescript
class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  
  constructor();
  init(): void;
  playNote(frequency: number, duration: number, startTime?: number): OscillatorNode;
  setVolume(value: number): void;
  stopAll(): void;
  get currentTime(): number;
}
```

### 4.3 乐谱渲染器接口
```typescript
class ScoreRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score: Score;
  private currentBeat: number;
  private highlightedNotes: Map<number, number>;
  private userMarkers: Array<{x: number; y: number; startTime: number}>;
  private animationId: number;
  private onNoteReach: (noteIndex: number) => void;
  
  constructor(canvas: HTMLCanvasElement, score: Score);
  setSpeed(speed: number): void;
  play(): void;
  pause(): void;
  reset(): void;
  addUserMarker(pitchMidi: number): void;
  setLoop(loop: boolean): void;
  destroy(): void;
}
```

### 4.4 钢琴键盘接口
```typescript
class PianoKeyboard {
  private container: HTMLElement;
  private audioEngine: AudioEngine;
  private onKeyPress: (midi: number) => void;
  private activeOscillators: Map<number, OscillatorNode>;
  
  constructor(container: HTMLElement, audioEngine: AudioEngine);
  render(): void;
  highlightKey(midi: number): void;
  setOnKeyPress(callback: (midi: number) => void): void;
  destroy(): void;
}
```

## 5. 性能优化要点
- Canvas重绘：每帧只重绘变化区域或使用双缓冲
- 光标动画：requestAnimationFrame 60FPS驱动，基于时间差计算位置
- 音频调度：使用AudioContext.currentTime高精度调度，避免setTimeout延迟
- 事件节流：键盘事件使用节流，避免高频触发
- 内存管理：主动停止OscillatorNode，清理Canvas动画，防止内存泄漏
