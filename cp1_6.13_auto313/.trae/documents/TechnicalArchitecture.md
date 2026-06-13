## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "main.ts"
    "main.ts" --> "GameManager.ts"
    "GameManager.ts" --> "Renderer.ts"
    "GameManager.ts" --> "EffectManager.ts"
    "GameManager.ts" --> "AIPlayer.ts"
    "GameManager.ts" --> "BoardState"
    "Renderer.ts" --> "Canvas2D"
    "EffectManager.ts" --> "AnimationQueue"
    "AIPlayer.ts" --> "GameManager.ts"
```

**分层架构**：
- 入口层：index.html → main.ts（初始化Canvas、事件绑定、游戏循环）
- 逻辑层：GameManager.ts（棋盘状态、回合切换、连线检测、血量更新）
- 渲染层：Renderer.ts（绘制棋盘、符文、粒子、碎片条、UI文字）
- 特效层：EffectManager.ts（翻转、爆裂、波纹、碎片飞散聚合、洗牌动画）
- AI层：AIPlayer.ts（搜索最优翻转位置或随机选择）

## 2. 技术说明

- 前端：TypeScript + Canvas 2D API + Vite
- 初始化工具：Vite
- 后端：无
- 数据库：无
- 音效：Web Audio API（程序化生成音效，无需外部音频文件）

## 3. 文件结构

| 文件路径 | 职责 |
|----------|------|
| package.json | 依赖管理（typescript、vite），启动脚本npm run dev |
| vite.config.js | 构建配置，指向index.html |
| tsconfig.json | 严格模式，模块目标ES2020 |
| index.html | 入口页面，全屏深色渐变背景，无滚动条，加载主脚本 |
| src/main.ts | 游戏入口，初始化Canvas、事件绑定、游戏循环，调用GameManager |
| src/GameManager.ts | 游戏逻辑核心，管理棋盘状态、回合切换、连线检测、血量更新 |
| src/Renderer.ts | 绘制棋盘网格、符文、粒子、碎片条、UI文字，每帧更新 |
| src/EffectManager.ts | 管理翻转、爆裂、波纹、碎片飞散聚合、洗牌等动画特效 |
| src/AIPlayer.ts | AI决策：优先搜索最多连线位置，否则随机选择 |

## 4. 核心数据模型

### 4.1 棋盘状态

```typescript
enum Element { Fire, Water, Wind, Earth }

interface Cell {
  element: Element;
  row: number;
  col: number;
  scale: number;
  breathPhase: number;
  flipAngle: number;
  isFlipping: boolean;
}

interface PlayerState {
  health: number;
  score: number;
  fragmentOffsets: { x: number; y: number; rotation: number; visible: boolean }[];
}

interface GameState {
  board: Cell[][];
  player: PlayerState;
  ai: PlayerState;
  currentTurn: 'player' | 'ai';
  turnCount: number;
  isAnimating: boolean;
  gameOver: boolean;
}
```

### 4.2 特效数据

```typescript
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

interface Ripple {
  x: number; y: number;
  radius: number; maxRadius: number;
  life: number; color: string;
}

interface Fragment {
  x: number; y: number;
  originX: number; originY: number;
  vx: number; vy: number;
  rotation: number;
  state: 'idle' | 'scattering' | 'gathering';
  timer: number;
}
```

## 5. 游戏循环架构

```mermaid
flowchart LR
    "requestAnimationFrame" --> "update"
    "update" --> "GameManager.update"
    "GameManager.update" --> "EffectManager.update"
    "EffectManager.update" --> "粒子/波纹/碎片更新"
    "update" --> "Renderer.draw"
    "Renderer.draw" --> "Canvas2D绘制"
```

**帧循环**：
1. `main.ts`通过`requestAnimationFrame`驱动每帧调用
2. `GameManager.update()`更新游戏逻辑、处理动画队列
3. `EffectManager.update()`更新所有活跃粒子、波纹、碎片动画
4. `Renderer.draw()`根据当前状态绘制完整画面

## 6. AI决策算法

1. 遍历所有格子，模拟翻转每个格子
2. 计算翻转后能形成的最大连线数
3. 选择能形成最多连线的格子
4. 若多个格子连线数相同，随机选择其一
5. 若无可形成连线的格子，随机选择
6. 决策时间通过`setTimeout`延迟0.8-1.2秒模拟思考

## 7. 连线检测算法

1. 对每个格子检查四个方向：水平右、垂直下、对角右下、对角右上
2. 沿方向计数连续同色符文数量
3. 若连续数≥3，记录该连线
4. 去重处理（避免同一条线被重复检测）
5. 返回所有匹配的连线集合
