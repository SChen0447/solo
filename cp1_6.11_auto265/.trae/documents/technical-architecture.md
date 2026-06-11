# 深海热液盲虾共生模拟 - 技术架构文档

## 1. 技术选型

### 1.1 核心框架
- **React 18** - 组件化UI框架
- **TypeScript** - 类型安全的JavaScript超集
- **Vite 5** - 下一代前端构建工具，提供极速开发体验

### 1.2 UI与动画
- **Framer Motion** - React动画库，用于UI交互动画
- **Canvas 2D API** - 高性能游戏画面渲染

### 1.3 工具库
- **uuid** - 唯一ID生成
- **zod** - 运行时类型验证

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                      App.tsx                        │
│  状态管理 | 数据协调 | 组件组合                      │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐     ┌──────────────────┐
│  ControlPanel    │     │  StatusPanel     │
│  环境参数调节     │     │  实时数据展示     │
└──────────────────┘     └──────────────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │   useSimulation      │
           │   模拟逻辑Hook       │
           └──────────┬───────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │  SimulationCanvas    │
           │  Canvas渲染组件       │
           └──────────────────────┘
```

### 2.2 数据流
1. 用户通过ControlPanel调节环境参数
2. 参数更新到App.tsx的state中
3. useSimulation hook接收参数并更新模拟逻辑
4. SimulationCanvas每帧从hook获取快照数据并渲染
5. StatusPanel展示实时统计数据

## 3. 核心模块设计

### 3.1 类型定义 (constants.ts)

```typescript
// 环境参数
interface EnvironmentParams {
  temperature: number;  // 5-95 °C
  ph: number;           // 2.0-9.0
  sulfide: number;      // 0.1-5.0 mmol/L
}

// 盲虾
interface Shrimp {
  id: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  color: string;
  glowIntensity: number;
  bacteriaColor: string | null;
  bacteriaSize: number;
  isMarked: boolean;
  trail: { x: number; y: number }[];
  onPatchTime: number;
  currentPatchId: string | null;
}

// 菌群斑块
interface BacteriaPatch {
  id: string;
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  color: string;
  glowIntensity: number;
  growthRate: number;
}

// 烟雾粒子
interface SmokeParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

// 交换动画粒子
interface ExchangeParticle {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}
```

### 3.2 模拟逻辑 Hook (useSimulation.ts)

核心功能：
- 初始化盲虾、菌群斑块、粒子系统
- 每帧更新物理状态
- 环境参数响应式更新
- 碰撞检测与交互逻辑
- 返回当前帧快照数据

更新循环：
1. 更新烟雾粒子位置与生命周期
2. 更新盲虾位置（趋温行为、随机游动）
3. 检测盲虾与菌群斑块的碰撞
4. 更新菌毯生长状态
5. 检测盲虾之间的碰撞与菌群交换
6. 更新菌群斑块大小
7. 更新交换动画粒子
8. 计算统计数据

### 3.3 Canvas渲染组件 (SimulationCanvas.tsx)

渲染层次（从底到顶）：
1. 深海渐变背景
2. 热液喷口（SVG）
3. 烟雾粒子
4. 菌群斑块
5. 盲虾轨迹线
6. 盲虾本体 + 菌毯
7. 交换动画粒子

交互处理：
- 鼠标滚轮缩放
- 鼠标拖拽平移
- 点击选择盲虾

### 3.4 控制面板 (ControlPanel.tsx)

三个滑块组件：
- 温度滑块（5-95°C）
- pH值滑块（2.0-9.0）
- 硫化物浓度滑块（0.1-5.0 mmol/L）

样式特点：
- 发光轨道与指针
- 悬停放大效果
- 实时数值显示

### 3.5 状态面板 (StatusPanel.tsx)

显示内容：
- 盲虾总数
- 菌群覆盖率
- 共生配对次数
- 菌群环形图谱

## 4. 算法设计

### 4.1 盲虾趋温行为算法

```
目标方向 = 最适温区方向 + 随机扰动
最适温区：温度30-60°C且pH 4.0-6.0的区域

每帧更新：
1. 计算当前位置的环境适宜度
2. 若不在最适区，向喷口方向（最适区中心）调整角度
3. 添加随机游动扰动（模拟探索行为）
4. 根据速度更新位置
5. 边界检测与反弹
```

### 4.2 菌群生长算法

```
生长速率 = f(温度, pH, 硫化物浓度)

适宜条件：
- 温度：40-70°C（最适55°C）
- pH：3.0-7.0（最适5.0）
- 硫化物：越高生长越快（饱和效应）

斑块大小 = baseRadius * (1 + growthFactor)
growthFactor 范围：-0.5 ~ +1.0
```

### 4.3 颜色融合算法

两只盲虾相遇时，菌毯颜色在RGB空间线性插值：
```
newColor.r = shrimpA.color.r * 0.5 + shrimpB.color.r * 0.5
newColor.g = shrimpA.color.g * 0.5 + shrimpB.color.g * 0.5
newColor.b = shrimpA.color.b * 0.5 + shrimpB.color.b * 0.5
```

### 4.4 碰撞检测

使用圆形碰撞检测：
```
距离 < (半径A + 半径B) → 碰撞
```

- 盲虾-菌群斑块：虾位置与斑块中心距离 < 斑块半径
- 盲虾-盲虾：两虾位置距离 < 虾身体宽度

## 5. 性能优化

### 5.1 Canvas渲染优化
- 使用 requestAnimationFrame 驱动渲染循环
- 分层渲染，静态元素缓存到离屏Canvas
- 粒子对象池复用，减少GC

### 5.2 状态更新优化
- 模拟逻辑与渲染分离
- 使用 useRef 存储高频更新数据
- 避免React重渲染影响游戏循环

### 5.3 交互优化
- 点击检测使用空间分区（网格法）
- 轨迹线采用环形缓冲区限制长度

## 6. 项目文件结构

```
.
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── App.tsx
    ├── components/
    │   ├── SimulationCanvas.tsx
    │   ├── ControlPanel.tsx
    │   └── StatusPanel.tsx
    ├── hooks/
    │   └── useSimulation.ts
    └── utils/
        └── constants.ts
```
