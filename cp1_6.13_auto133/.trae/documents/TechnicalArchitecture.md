## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "main.ts"
    "main.ts" --> "GameManager"
    "GameManager" --> "PaintManager"
    "GameManager" --> "UnitManager"
    "GameManager" --> "ParticleManager"
    "PaintManager" --> "UnitManager.spawn"
    "UnitManager" --> "ParticleManager"
    "GameManager" --> "Canvas2D 渲染"
    "GameManager" --> "游戏状态机"
    "GameManager" --> "AI对手状态机"
```

## 2. 技术说明

- 前端：TypeScript + Vite + Canvas2D + GSAP（无框架）
- 构建工具：Vite（指向index.html）
- 动画库：GSAP（用于印章悬停、光环脉动等缓动动画）
- 初始化工具：手动创建项目结构（非框架模板，无React/Vue）
- 后端：无
- 数据库：无

## 3. 文件结构

| 文件路径 | 职责 |
|---------|------|
| package.json | 依赖：typescript、vite、gsap；启动脚本：npm run dev |
| vite.config.js | 构建配置，指向index.html |
| tsconfig.json | 严格模式，ES模块目标 |
| index.html | 入口页面，宣纸纹理背景 |
| src/main.ts | 应用入口，初始化Canvas和所有管理器，启动游戏循环 |
| src/GameManager.ts | 游戏核心逻辑，管理状态、玩家操作与AI状态机 |
| src/PaintManager.ts | 笔触绘制管理器，处理鼠标绘制墨水士兵 |
| src/UnitManager.ts | 墨水士兵管理器，管理士兵创建、移动、攻击AI、死亡动画 |
| src/ParticleManager.ts | 粒子特效管理器，墨水飞溅、消散、击中粒子效果 |

## 4. 核心数据结构

### 4.1 UnitData（墨水士兵）

```typescript
interface UnitData {
  id: number;
  x: number;
  y: number;
  radius: number;       // 8-20px
  hp: number;           // 50-150
  maxHp: number;
  attack: number;       // 默认20
  speed: number;        // 150px/s
  side: 'player' | 'enemy';
  state: 'idle' | 'moving' | 'attacking' | 'dying';
  targetX: number;
  targetY: number;
  targetUnit: UnitData | null;
  lastAttackTime: number;
  selected: boolean;
  attackDamage: number; // 基础20，敌方随时间递增
}
```

### 4.2 ParticleData（粒子）

```typescript
interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;       // 8-20px (特效) / 6-15px (消散墨点)
  alpha: number;        // 0.8→0
  life: number;         // 1-2秒
  maxLife: number;
  type: 'splash' | 'hit' | 'dissolve' | 'ripple';
}
```

### 4.3 PaintStroke（笔触数据）

```typescript
interface PaintStroke {
  points: { x: number; y: number }[];
  length: number;       // 累计轨迹长度
}
```

## 5. 游戏循环架构

```mermaid
flowchart TD
    "requestAnimationFrame" --> "计算deltaTime"
    "计算deltaTime" --> "GameManager.update"
    "GameManager.update" --> "PaintManager.update"
    "GameManager.update" --> "UnitManager.update"
    "GameManager.update" --> "AI逻辑(生成敌方)"
    "GameManager.update" --> "ParticleManager.update"
    "GameManager.update" --> "渲染层"
    "渲染层" --> "绘制宣纸背景(缓存)"
    "渲染层" --> "绘制分界线"
    "渲染层" --> "绘制所有士兵"
    "渲染层" --> "绘制选中光环"
    "渲染层" --> "绘制框选区域"
    "渲染层" --> "绘制攻击拖尾"
    "渲染层" --> "绘制粒子特效"
    "渲染层" --> "绘制HUD"
    "渲染层" --> "绘制印章"
```

## 6. 交互状态机

```mermaid
stateDiagram-v2
    "空闲" --> "绘制模式": 左侧按下拖拽
    "空闲" --> "选中模式": 点击己方士兵
    "空闲" --> "框选模式": 己方区域拖拽(非士兵上)
    "绘制模式" --> "生成士兵": 松开鼠标
    "选中模式" --> "指挥移动": 右侧点击
    "选中模式" --> "空闲": 点击空白
    "框选模式" --> "多选完成": 松开鼠标
    "多选完成" --> "指挥移动": 右侧点击
    "指挥移动" --> "空闲": 士兵开始移动
```
