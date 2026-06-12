## 1. 架构设计

```mermaid
flowchart TB
    "main.ts" --> "game.ts"
    "game.ts" --> "player.ts"
    "game.ts" --> "level.ts"
    "main.ts" --> "renderer.ts"
    "renderer.ts" --> "game.ts"
    "player.ts" --> "level.ts"
```

**数据流向说明：**
- main.ts（入口）：接收键盘输入 → 传递给 game.ts → 驱动所有更新 → 调用 renderer.ts 绘制
- game.ts（全局状态）：管理时间轴记录、游戏模式、关卡数据 → 操作时间轴数组 → 返回当前帧状态
- player.ts（玩家）：从 game.ts 读取当前帧 → 计算新位置 → 更新状态 → 写入回溯记录
- level.ts（关卡）：被 game.ts / player.ts 调用进行碰撞判断 → 返回碰撞结果
- renderer.ts（渲染）：从 game.ts 获取渲染列表 → 按Z顺序绘制到Canvas

## 2. 技术栈说明

- 前端框架：纯 TypeScript + Canvas 2D API（无UI框架）
- 构建工具：Vite 5.x
- 语言：TypeScript 5.x（严格模式，ESModule）
- 样式：原生 CSS（Google Fonts Press Start 2P）
- 数据存储：纯前端内存（无后端、无持久化）

## 3. 文件结构

```
项目根目录/
├── package.json            # 依赖配置：vite, typescript；脚本：npm run dev
├── vite.config.js          # Vite基础配置
├── tsconfig.json           # TS严格模式配置
├── index.html              # 入口HTML（Canvas、UI面板、状态栏）
└── src/
    ├── main.ts             # 初始化画布、游戏循环、输入协调
    ├── game.ts             # 全局状态管理、时间轴、模式切换
    ├── player.ts           # 玩家逻辑、位置速度、回溯记录、状态机
    ├── renderer.ts         # 渲染器：实体、UI、特效
    └── level.ts            # 关卡数据、碰撞检测
```

## 4. 核心数据结构定义

### 4.1 玩家状态
```typescript
interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facingRight: boolean;
  squash: number;          // 落地压缩动画 0~1
  isDead: boolean;
}
```

### 4.2 时光碎片
```typescript
interface Shard {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  collectAnim: number;     // 收集动画进度 0~1
}
```

### 4.3 陷阱状态
```typescript
interface SawTrap {
  type: 'saw';
  centerX: number;
  centerY: number;
  radius: number;
  angle: number;
  speed: number;
}

interface SpikeTrap {
  type: 'spike';
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  phase: number;
  speed: number;
  range: number;
}

interface LaserTrap {
  type: 'laser';
  x: number;
  y: number;
  width: number;
  height: number;
  direction: number;       // 1或-1
  speed: number;
  minX: number;
  maxX: number;
}

type Trap = SawTrap | SpikeTrap | LaserTrap;
```

### 4.4 时间帧记录
```typescript
interface FrameRecord {
  player: PlayerState;
  traps: Trap[];
}
```

### 4.5 游戏全局状态
```typescript
interface GameState {
  mode: 'normal' | 'rewind' | 'complete';
  timeline: FrameRecord[];         // 最多500帧
  rewindFramesLeft: number;        // 剩余回溯帧数 (3秒 = 180帧)
  shards: Shard[];
  shardsCollected: number;
  totalShards: number;
  goalX: number;
  goalY: number;
  goalActive: boolean;
  completeAnim: number;            // 完成动画进度
  timer: number;                   // 游戏计时(秒)
  starParticles: StarParticle[];   // 背景星星
}
```

## 5. 性能约束实现方案

| 约束 | 实现方案 |
|------|----------|
| 帧率 ≥ 50fps | 固定60fps更新循环 (requestAnimationFrame + dt补偿)，分离更新与渲染 |
| 回溯记录 ≤ 500帧 | timeline数组使用环形缓冲，超出时丢弃最早帧 |
| 碰撞检测 ≤ 2ms/帧 | AABB碰撞检测，预计算平台边界，每帧最多检测20次 |
| 内存优化 | 帧记录使用轻量级对象，陷阱序列化避免深拷贝冗余 |

## 6. 碰撞检测算法

- 玩家 vs 平台：AABB轴对齐包围盒检测，逐轴分离解决（先X后Y）
- 玩家 vs 陷阱：
  - 旋转锯片：圆形-矩形碰撞检测
  - 尖刺平台：AABB检测
  - 激光墙：AABB检测
- 玩家 vs 碎片：圆形-矩形碰撞检测（碎片视为16px半径圆）
- 玩家 vs 终点：AABB检测 + 碎片收集完成判定
