# 落樱·琉璃棋局 - 技术架构文档

## 1. 技术选型与架构总览

### 1.1 核心技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.x | 类型安全的应用逻辑开发 |
| Vite | 5.x | 构建工具，提供快速开发服务器 |
| HTML5 Canvas 2D | - | 高性能像素级渲染 |
| requestAnimationFrame | - | 60fps 动画循环驱动 |

### 1.2 架构模式
采用**分层模块化架构**，将渲染、逻辑、特效严格分离：
```
┌─────────────────────────────────────────────────┐
│                   main.ts                       │
│         应用入口 / 动画循环 / 事件调度           │
├─────────────────┬─────────────────┬─────────────┤
│    board.ts     │    shogi.ts     │  effects.ts │
│  棋盘渲染层     │  游戏逻辑层     │  特效系统   │
│  - 网格绘制     │  - 落子判断     │  - 粒子管理 │
│  - 棋子渲染     │  - 同色检测     │  - 生命周期 │
│  - 交互绑定     │  - 融合逻辑     │  - 颜色插值 │
│  - UI元素       │  - 撤销栈       │  - 动画计算 │
└─────────────────┴─────────────────┴─────────────┘
```

---

## 2. 文件结构与职责

### 2.1 配置文件
| 文件 | 职责 |
|------|------|
| `package.json` | 依赖声明 (typescript, vite)，启动脚本 `npm run dev` |
| `vite.config.js` | Vite 构建配置，指定 index.html 入口，处理 TypeScript |
| `tsconfig.json` | TypeScript 严格模式配置，ES 模块目标 |
| `index.html` | 入口 HTML，全屏深色背景，meta 视口设置 |

### 2.2 源代码模块

#### `src/effects.ts` - 特效系统
**核心职责**：管理所有粒子特效的生命周期与渲染

**数据结构**：
```typescript
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  type: 'explosion' | 'pulse' | 'ripple' | 'trail';
}
```

**导出接口**：
- `triggerEffect(type, params)` → 触发指定特效
- `updateEffects(deltaTime)` → 更新所有活动特效
- `renderEffects(ctx)` → 渲染特效到画布

**特效类型**：
1. `explosion` - 落子爆炸粒子（16个，扩散消散）
2. `pulse` - 融合脉动光晕（周期1秒，sin波形）
3. `ripple` - 撤销波纹（圆形扩散，透明度衰减）
4. `trail` - 悬停轨迹（发光渐变线）

#### `src/board.ts` - 棋盘渲染层
**核心职责**：Canvas 渲染管理、用户交互绑定、棋子状态存储

**数据结构**：
```typescript
interface Stone {
  gridX: number; gridY: number;      // 网格坐标
  color: string;                     // 棋子颜色
  state: 'dropping' | 'idle' | 'merging' | 'undoing';
  animProgress: number;              // 动画进度 0-1
  offsetX: number; offsetY: number;  // 融合偏移像素
}
```

**导出接口**：
- `initBoard(canvas)` → 初始化棋盘
- `render()` → 绘制棋盘背景、网格、棋子、UI
- `getGridPos(clientX, clientY)` → 屏幕坐标转网格坐标
- `addStone(gridX, gridY, color)` → 添加棋子并触发落子动画
- `removeStone(gridX, gridY)` → 移除棋子并触发撤销动画
- `addMergeLine(stoneA, stoneB)` → 添加融合连线
- `removeMergeLine(stoneA, stoneB)` → 移除融合连线
- `bindInteractions(onClick, onHover)` → 绑定鼠标事件
- `updateTurnCount(n)` → 更新回合显示
- `updateRecentMoves(moves)` → 更新最近落子预览

**画布坐标计算**：
```
棋盘偏移 = (canvas尺寸 - 棋盘尺寸) / 2
单元格尺寸 = 棋盘尺寸 / 18
交叉点坐标 = 棋盘偏移 + gridPos × 单元格尺寸
```

#### `src/shogi.ts` - 游戏逻辑层
**核心职责**：游戏规则逻辑、状态管理、撤销栈

**数据结构**：
```typescript
interface Move {
  gridX: number; gridY: number;
  color: string;
  mergedPairs: Array<[Stone, Stone]>;  // 本步触发的融合对
}

class ShogiGame {
  stones: Stone[];           // 所有棋子
  history: Move[];           // 撤销历史栈
  turnCount: number;         // 回合数
  recentMoves: Move[];       // 最近5步（用于预览）
}
```

**导出接口**：
- `initGame(boardInstance)` → 初始化游戏
- `doMove(gridX, gridY)` → 执行落子（调用 board.addStone + effects.triggerEffect）
- `undoMove()` → 撤销上一步（调用 board.removeStone + effects.triggerEffect）
- `checkAdjacentSameColor(stone)` → 检测相邻同色棋子
- `applyMergeEffect(stoneA, stoneB)` → 应用融合效果

**同色检测算法**：
```
对新落子，检查4个方向 (±1,0) (0,±1):
  如果邻格存在棋子 && 颜色相同:
    记录为融合对
    触发融合连线 + 脉动光晕 + 位置偏移
```

#### `src/main.ts` - 应用入口
**核心职责**：初始化、主循环、事件分发

**流程**：
```
1. 获取 canvas 元素，设置尺寸（含响应式处理）
2. 初始化 effects 系统
3. 创建 board 实例并绑定 canvas
4. 创建 shogi 实例并注入 board
5. 绑定全局事件：
   - canvas 点击 → shogi.doMove
   - Z 键按下 → shogi.undoMove
   - 窗口 resize → 重新计算尺寸
6. 启动 requestAnimationFrame 循环：
   - 更新 effects
   - 更新棋子动画进度
   - 调用 board.render()
   - 调用 effects.renderEffects()
```

---

## 3. 渲染管线

每帧执行顺序（60fps）：
```
[逻辑更新阶段]
  1. effects.updateEffects(dt)        → 粒子物理 & 生命周期
  2. 更新各棋子 animProgress          → 落子/撤销动画进度
  3. 检查并处理融合状态               → 位置偏移插值

[渲染阶段]
  4. ctx.fillRect (页面背景渐变)
  5. board.render()
     ├─ 绘制棋盘区域背景 (木纹渐变)
     ├─ 绘制网格线 (半透明金色)
     ├─ 绘制融合连线 (发光渐变)
     ├─ 绘制棋子 (含光晕 & 状态动画)
     ├─ 绘制脉动光晕 (融合点)
     └─ 绘制 UI (回合数 / 预览点)
  6. effects.renderEffects(ctx)
     ├─ 爆炸粒子
     ├─ 波纹效果
     └─ 悬停轨迹
  7. 绘制撤销按钮 (DOM 或 Canvas)
```

---

## 4. 关键技术实现

### 4.1 颜色处理工具
```typescript
// hex → rgba
function hexToRgba(hex: string, alpha: number): string
// 两色混合
function mixColors(c1: string, c2: string, t: number): string
// 颜色淡化
function lightenColor(hex: string, amount: number): string
```

### 4.2 缓动函数
```typescript
easeOutElastic(t)   // 落子弹性动画
easeOutQuad(t)      // 粒子扩散
easeInOutQuad(t)    // 撤销淡出
```

### 4.3 响应式适配
```typescript
function resize() {
  const vw = window.innerWidth
  const scale = vw < 768 ? 0.9 : 1
  const baseSize = Math.min(vw, window.innerHeight) * scale
  canvas.width = baseSize * devicePixelRatio
  canvas.height = baseSize * devicePixelRatio
  canvas.style.width = baseSize + 'px'
  // 传递 scale 到 board 用于调整棋子/网格尺寸
}
```

### 4.4 性能优化
- **脏矩形渲染**：仅重绘动画区域（可选优化）
- **粒子池**：对象复用避免 GC 抖动
- **离屏缓存**：棋盘背景渲染到离屏 canvas，每帧直接贴图
- **devicePixelRatio 处理**：高 DPI 屏幕清晰渲染

---

## 5. 外部依赖说明

| 包名 | 用途 | 是否生产依赖 |
|------|------|-------------|
| `typescript` | 类型检查与编译 | 开发依赖 |
| `vite` | 构建与开发服务器 | 开发依赖 |

**无第三方运行时依赖**，所有动画/粒子/物理逻辑全部原生实现，保证轻量与性能。
