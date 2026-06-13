## 1. 架构设计

```mermaid
graph TD
    subgraph "用户交互层"
        A["鼠标/键盘事件"]
    end
    subgraph "应用入口层"
        B["main.ts<br/>事件分发中心"]
    end
    subgraph "渲染层"
        C["CanvasManager.ts<br/>双缓存画布渲染"]
    end
    subgraph "音频层"
        D["AudioEngine.ts<br/>Tone.js合成引擎"]
    end
    subgraph "UI控件层"
        E["UIController.ts<br/>参数调节与控制"]
    end
    A -->|用户输入| B
    B -->|绘制指令| C
    B -->|控制指令| E
    C -->|线条数据 LineData[]| D
    E -->|参数更新 BPM/Volume/Reverb| D
    E -->|清除/撤销| C
    D -->|播放进度回调| C
```

## 2. 技术说明

- **前端技术栈**：TypeScript 5.x + Vite 5.x（无UI框架，原生Canvas + DOM）
- **音频合成**：Tone.js v14（Web Audio API封装）
- **动画库**：GSAP 3.x（用于UI过渡动画和时间轴控制）
- **构建工具**：Vite（原生ESM HMR）
- **包管理**：npm

### 模块职责与调用关系

| 文件 | 职责 | 输入 | 输出/调用 |
|------|------|------|-----------|
| main.ts | 应用入口、事件总线、模块协调 | DOM事件、用户交互 | 调用 CanvasManager / AudioEngine / UIController 方法 |
| CanvasManager.ts | 画布渲染、笔画管理、双缓存 | 绘制指令、播放进度、线条数据 | LineData 对象输出给 AudioEngine |
| AudioEngine.ts | 音频合成、音色映射、播放调度 | LineData、BPM、音量、混响参数 | 播放进度回调 → CanvasManager |
| UIController.ts | UI控件渲染、参数状态管理 | 用户控件交互事件 | 参数更新 → AudioEngine，操作指令 → CanvasManager |

## 3. 数据模型定义

### 3.1 核心数据结构

```typescript
// 单个坐标点
interface Point {
  x: number;          // 画布相对X坐标 0-1
  y: number;          // 画布相对Y坐标 0-1
  timestamp: number;  // 绘制时的时间戳(ms)
}

// 音色类型
type InstrumentType = 'piano' | 'strings' | 'percussion';

// 颜色映射
const COLOR_MAP: Record<string, InstrumentType> = {
  '#ff4444': 'piano',
  '#4488ff': 'strings',
  '#44ff88': 'percussion',
};

// 单条笔画数据
interface LineData {
  id: string;              // 唯一标识
  points: Point[];         // 坐标点数组
  color: string;           // 颜色 hex
  instrument: InstrumentType;
  startTime: number;       // 绘制开始时间
  endTime: number;         // 绘制结束时间
  curvature: number[];     // 各段曲率（用于音高映射）
  segmentLengths: number[]; // 各段长度（用于音长映射）
  notes: NoteData[];       // 解析后的音符序列
}

// 单个音符数据
interface NoteData {
  pitch: number;     // 0-12 半音阶
  duration: number;  // 秒 0.1-2
  velocity: number;  // 力度 0-1
  time: number;      // 在Timeline中的相对时间
  instrument: InstrumentType;
}

// 应用全局状态
interface AppState {
  isPlaying: boolean;
  bpm: number;          // 60-180
  volume: number;       // 0-100
  reverb: number;       // 0-100 dry/wet%
  currentColor: string;
  lines: LineData[];
  currentStroke: Point[] | null;
  playbackProgress: number; // 0-1
}
```

## 4. 关键算法

### 4.1 线条特征提取
- **曲率计算**：对相邻三点计算曲率 `k = |(p2-p1) × (p3-p2)| / |p2-p1| * |p3-p2|`
- **曲率→音高映射**：归一化曲率值到 0-12 半音程，基准音 C4 = 261.63Hz
- **长度→音长映射**：段长度映射到 0.1s-2s，按BPM量化到最近的音符时值
- **颜色→音色映射**：红→钢琴(FM合成)，蓝→弦乐(连奏采样合成)，绿→打击乐(噪声+包络)

### 4.2 性能优化策略
- **双缓存渲染**：离屏Canvas缓存静态线条，仅重绘当前笔画和点亮区域
- **鼠标事件节流**：throttle 到每16ms(60fps)处理一次 mousemove
- **线条数量限制**：最多同时维护20条LineData，超出时丢弃最早且已播放完成的
- **音频预调度**：Tone.js Transport 提前100ms调度音符，保证低延迟播放

## 5. 项目文件结构

```
auto122/
├── index.html              # 入口HTML
├── package.json            # 依赖配置
├── vite.config.js          # Vite构建配置
├── tsconfig.json           # TypeScript配置
└── src/
    ├── main.ts             # 应用入口
    ├── CanvasManager.ts    # 画布管理
    ├── AudioEngine.ts      # 音频引擎
    └── UIController.ts     # UI控件
```
