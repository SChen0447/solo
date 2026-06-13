## 1. 架构设计

```mermaid
flowchart TD
    "index.html" --> "main.ts"
    "main.ts" --> "cardMatrix.ts"
    "main.ts" --> "cardRenderer.ts"
    "main.ts" --> "audioEngine.ts"
    "cardMatrix.ts" --> "cardRenderer.ts"
    "cardMatrix.ts" --> "audioEngine.ts"
```

- **展示层**：Canvas 2D全屏渲染（卡片、粒子、光纹、背景）
- **逻辑层**：cardMatrix.ts（游戏状态、翻转/配对/连击逻辑）
- **渲染层**：cardRenderer.ts（卡片绘制、动画、粒子系统）
- **音频层**：audioEngine.ts（Web Audio API音效合成）

## 2. 技术说明

- **前端**：TypeScript + Canvas 2D API + Web Audio API + Vite
- **构建工具**：Vite 5.0.0
- **语言**：TypeScript 5.3.2（严格模式，target: ES2020，module: ESNext，moduleResolution: bundler）
- **无外部UI框架**：纯Canvas渲染，无React/Vue
- **无后端**：纯前端单页应用

## 3. 文件结构

| 文件 | 职责 |
|------|------|
| package.json | 项目依赖与脚本（typescript@5.3.2, vite@5.0.0, npm run dev） |
| index.html | 入口HTML，全屏适配，meta viewport，type=module引入 |
| tsconfig.json | TypeScript配置（strict, ES2020, ESNext, bundler） |
| vite.config.js | Vite构建配置，指向index.html |
| src/main.ts | 主入口，初始化Game类，绑定事件，FPS控制，游戏循环 |
| src/cardMatrix.ts | 4x4卡片矩阵生成与管理，翻转逻辑，配对检测，连击计数 |
| src/cardRenderer.ts | 卡片绘制：背面光纹动画、正面几何图案、3D翻转、成功粒子、失败闪烁 |
| src/audioEngine.ts | Web Audio API封装：播放音调（正弦/方波）、噪声脉冲、和弦 |

## 4. 核心数据结构

```typescript
interface Card {
  id: number;
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
  x: number;
  y: number;
  flipProgress: number;
  matchProgress: number;
  failProgress: number;
  patternType: number;
  patternColor: string;
}

interface GameState {
  cards: Card[];
  firstFlipped: number | null;
  secondFlipped: number | null;
  score: number;
  matchedPairs: number;
  combo: number;
  maxCombo: number;
  elapsedTime: number;
  isLocked: boolean;
  isComplete: boolean;
  isVictory: boolean;
  victoryTimer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
```

## 5. 渲染管线

每帧执行顺序：
1. 清空Canvas
2. 绘制径向渐变背景
3. 绘制卡片（背面光纹 / 正面图案 / 翻转动画）
4. 更新和绘制粒子系统
5. 绘制胜利动画（星型光柱 / 烟花）
6. 绘制控制栏（HTML overlay）
7. requestAnimationFrame循环

## 6. 音频架构

```typescript
class AudioEngine {
  private ctx: AudioContext;
  playTone(freq: number, duration: number, type: OscillatorType): void;
  playNoise(duration: number): void;
  playChord(freqs: number[], duration: number): void;
}
```

- C4(262Hz, 正弦波, 0.2s) - 翻转第一张
- E4(330Hz, 正弦波, 0.2s) - 翻转第二张
- C5(523Hz, 方波, 0.3s + 泛音) - 匹配成功
- 低频噪声(0.15s) - 匹配失败

## 7. 动画系统

- **翻转动画**：0.6秒，ease-in-out缓动，模拟3D旋转（缩放X轴0→1）
- **光纹动画**：每秒流动一圈，使用时间偏移的线性渐变
- **粒子系统**：20个彩色光点，向外扩散，透明度衰减
- **失败动画**：红色闪烁 + 缩小复原（0.3秒）
- **星型光柱**：50个金色光点，2秒/圈旋转，5秒持续
- **烟花动画**：粒子汇聚→绽放→消散
