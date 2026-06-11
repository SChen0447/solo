## 1. 架构设计

```mermaid
flowchart TD
    "index.html 入口" --> "main.ts 游戏主控"
    "main.ts 游戏主控" --> "cave.ts 洞穴系统"
    "main.ts 游戏主控" --> "bat.ts 蝙蝠系统"
    "main.ts 游戏主控" --> "creatures.ts 生物系统"
    "cave.ts 洞穴系统" --> "柏林噪声生成器"
    "cave.ts 洞穴系统" --> "多边形墙壁渲染"
    "cave.ts 洞穴系统" --> "沙粒粒子系统"
    "bat.ts 蝙蝠系统" --> "移动惯性物理"
    "bat.ts 蝙蝠系统" --> "翅膀扇动动画"
    "bat.ts 蝙蝠系统" --> "光晕渲染"
    "bat.ts 蝙蝠系统" --> "声波脉冲系统"
    "creatures.ts 生物系统" --> "晶体脉动+粒子"
    "creatures.ts 生物系统" --> "萤火虫AI+吸引"
```

## 2. 技术说明

- 前端：TypeScript + HTML5 Canvas + Vite
- 构建工具：Vite（TypeScript插件，base设为'./'）
- 无后端、无数据库、纯前端游戏
- 初始化工具：手动创建项目结构（非React/Vue模板，纯Canvas游戏）

## 3. 文件结构

| 文件路径 | 用途 |
|----------|------|
| package.json | 依赖：typescript、vite；脚本：npm run dev |
| vite.config.js | 构建配置，启用TypeScript，base为'./' |
| tsconfig.json | 严格模式，目标ES2020 |
| index.html | 入口页面，深色背景，全屏适配，加载提示 |
| src/main.ts | 游戏入口，初始化Canvas、60fps主循环、模块调度、控制面板 |
| src/cave.ts | 洞穴地图生成和渲染：柏林噪声、多边形墙壁、沙粒地面 |
| src/bat.ts | 蝙蝠角色类：移动惯性、翅膀动画、光晕、声波发射与波纹渲染 |
| src/creatures.ts | 晶体和萤火虫管理：脉动、粒子、游走、吸引、螺旋动画 |

## 4. 核心数据结构

### 4.1 洞穴数据

```typescript
interface CaveRoom {
  center: { x: number; y: number };
  radius: number;
  vertices: { x: number; y: number }[];
  connections: number[];
}

interface CaveLayer {
  rooms: CaveRoom[];
}

interface SandParticle {
  x: number;
  y: number;
  phase: number;
  brightness: number;
}
```

### 4.2 蝙蝠与声波数据

```typescript
interface Bat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  wingAngle: number;
  wingDirection: number;
  isEmitting: boolean;
  emitCooldown: number;
}

interface SoundWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  isReflection: boolean;
  frequency: number;
  opacity: number;
}
```

### 4.3 生物数据

```typescript
interface Crystal {
  x: number;
  y: number;
  size: number;
  pulsePhase: number;
  brightness: number;
  sparkParticles: SparkParticle[];
  wallIndex: number;
  positionOnWall: number;
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  isAttracted: boolean;
  spiralAngle: number;
  spiralRadius: number;
  brightness: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}
```

## 5. 渲染管线

每帧执行顺序：
1. 清空Canvas（深黑背景）
2. 渲染洞穴墙壁（柏林噪声轮廓、蓝紫渐变、纹理噪波动画）
3. 渲染沙粒地面（闪烁周期1.5秒）
4. 渲染发光晶体（脉动亮度 + 闪光粒子）
5. 渲染声波波纹（同心圆、颜色渐变、反射波）
6. 渲染萤火虫（黄绿光点 + 光晕）
7. 渲染蝙蝠（三角形 + 翅膀动画 + 蓝色光晕）
8. 应用黑暗遮罩（仅蝙蝠光晕范围内可见）
9. 渲染控制面板（半透明叠加层）

## 6. 碰撞检测

- 使用射线-多边形边相交检测声波与墙壁的碰撞
- 使用点到多边形边的最近距离检测蝙蝠与墙壁的碰撞
- 使用圆形-点距离检测声波与晶体/萤火虫的碰撞
