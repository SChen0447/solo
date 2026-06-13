## 1. 架构设计

```mermaid
graph TD
    "index.html 入口页面" --> "src/main.ts 主入口"
    "src/main.ts 主入口" --> "src/sceneManager.ts 场景管理"
    "src/main.ts 主入口" --> "src/interaction.ts 交互管理"
    "src/sceneManager.ts 场景管理" --> "Canvas 2D 渲染层"
    "src/sceneManager.ts 场景管理" --> "星空背景系统"
    "src/sceneManager.ts 场景管理" --> "光影雕塑粒子系统"
    "src/sceneManager.ts 场景管理" --> "光波扩散特效系统"
    "src/interaction.ts 交互管理" --> "鼠标事件处理"
    "src/interaction.ts 交互管理" --> "GSAP动画缓动"
    "src/interaction.ts 交互管理" --> "雕塑命中检测"
    "src/styles.css" --> "全局样式与控制条"
```

## 2. 技术说明

- 前端：TypeScript + Vite + Canvas 2D API
- 依赖：typescript、vite、three（用于3D向量数学运算）、gsap（用于缓动动画）
- 初始化工具：Vite
- 后端：无
- 数据库：无

## 3. 文件结构

| 文件路径 | 职责 |
|---------|------|
| package.json | 项目依赖与脚本配置 |
| vite.config.js | Vite构建配置 |
| tsconfig.json | TypeScript严格模式配置，ES模块目标 |
| index.html | 入口页面，全屏深色背景 |
| src/main.ts | 主入口，初始化Canvas、相机、渲染循环，挂载交互管理器 |
| src/sceneManager.ts | 管理光影粒子系统和雕塑对象，处理粒子颜色/位置/大小动态更新 |
| src/interaction.ts | 处理鼠标拖拽、悬停、滚轮事件，生成光波扩散特效 |
| src/styles.css | 全局样式，背景色、字体、过渡动画、控制条样式、自定义光标 |

## 4. 核心数据结构

```typescript
interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  maxOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface Particle {
  theta: number;
  phi: number;
  radius: number;
  baseTheta: number;
  basePhi: number;
  baseRadius: number;
  size: number;
  baseSize: number;
  color: string;
  hue: number;
  pulsePhase: number;
  pulseSpeed: number;
  morphPhase: number;
  morphSpeed: number;
  opacity: number;
}

interface Sculpture {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
  primaryColor: string;
  secondaryColor: string;
  primaryHue: number;
  opacity: number;
  isSelected: boolean;
  rippleActive: boolean;
  rippleProgress: number;
  fadeOut: boolean;
}

interface Ripple {
  x: number;
  y: number;
  color: string;
  progress: number;
  maxRadius: number;
  duration: number;
  startTime: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}
```

## 5. 渲染管线

1. **清空画布**：填充径向渐变背景
2. **绘制星点**：根据闪烁周期更新透明度并绘制
3. **坐标变换**：应用相机偏移和缩放（translate + scale）
4. **绘制雕塑**：遍历每个雕塑，更新粒子位置（球面正弦波动）、颜色（HSL渐变）、大小（脉动），使用shadowBlur和lighter混合模式绘制发光粒子
5. **绘制光波**：对活跃的涟漪特效，绘制同心圆扩散
6. **绘制选中光晕**：对选中雕塑绘制外围白色光晕
7. **重置变换**

## 6. 性能优化策略

- 使用requestAnimationFrame单一渲染循环
- 粒子位置计算使用三角函数缓存（预计算sin/cos表或使用近似值）
- shadowBlur仅在必要时启用，绘制粒子时统一设置
- 视口外的雕塑跳过绘制
- 限制最大雕塑数量（10个）和每雕塑粒子数（200个）
- GSAP动画仅用于相机缓动，不用于粒子动画
