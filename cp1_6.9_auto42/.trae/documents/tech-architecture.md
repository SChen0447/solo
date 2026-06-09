## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "main.ts"
    "main.ts" --> "场景初始化(Scene/Camera/Light)"
    "main.ts" --> "轨道控制器(OrbitControls)"
    "main.ts" --> "plantConfig.ts"
    "main.ts" --> "plantGenerator.ts"
    "main.ts" --> "interactionPanel.ts"
    "plantConfig.ts" --> "植物参数接口定义"
    "plantConfig.ts" --> "3种植物预设数据"
    "plantGenerator.ts" --> "基座(CylinderGeometry)"
    "plantGenerator.ts" --> "茎(TubeGeometry)"
    "plantGenerator.ts" --> "叶片(LatheGeometry)"
    "plantGenerator.ts" --> "花朵/粒子(SphereGeometry)"
    "interactionPanel.ts" --> "光照滑块"
    "interactionPanel.ts" --> "水分滑块"
    "interactionPanel.ts" --> "植物选择下拉框"
    "interactionPanel.ts" --> "生长进度条"
    "GSAP" --> "切换动画"
    "GSAP" --> "生长过渡动画"
    "GSAP" --> "粒子飘散动画"
    "GSAP" --> "UI控件缓动"
```

## 2. 技术栈说明
- **前端框架**：无框架，原生 TypeScript
- **3D引擎**：Three.js@0.160.0
- **类型定义**：@types/three
- **构建工具**：Vite（禁用自动导入）
- **动画库**：GSAP@3.12.5
- **语言**：TypeScript（严格模式，ES模块）

## 3. 文件结构
| 文件路径 | 作用 |
|---------|------|
| `package.json` | 项目依赖与脚本配置 |
| `index.html` | 入口页面，canvas与UI叠加层 |
| `tsconfig.json` | TypeScript严格模式配置 |
| `vite.config.js` | Vite构建配置 |
| `src/main.ts` | 主入口，场景初始化与模块协调 |
| `src/plantConfig.ts` | 植物参数接口与3种植物预设数据 |
| `src/plantGenerator.ts` | 3D几何体生成器 |
| `src/interactionPanel.ts` | 交互控制面板UI创建与事件绑定 |

## 4. 数据模型

### 4.1 植物生长阶段接口
```typescript
interface GrowthStage {
  height: number;           // 植物高度
  stemDiameter: number;     // 茎干直径
  leafCount: number;        // 叶片数量
  leafAngle: number;        // 叶片角度(度)
  color: { r: number; g: number; b: number };  // 主体颜色RGB
  bloomProbability: number; // 开花概率 0-1
  petalOpenAngle: number;   // 花瓣张开角度(度)
}

interface PlantConfig {
  id: 'cactus' | 'orchid' | 'fern';
  name: string;              // 中文名称
  climateColor: string;      // 气候带主色调(HEX)
  stages: GrowthStage[];     // 生长阶段配置数组(多阶段插值)
  baseRadius: number;        // 基座半径
  stemSegments: number;      // 茎干分段数
  leafShape: 'flat' | 'spine' | 'compound'; // 叶片类型
  hasFlowers: boolean;       // 是否开花
  petalColor: { r: number; g: number; b: number }; // 花瓣颜色
}
```

### 4.2 环境状态
```typescript
interface EnvironmentState {
  light: number;      // 光照强度 0-100
  moisture: number;   // 水分湿度 0-100
  growth: number;     // 生长进度 0-100
  currentPlant: 'cactus' | 'orchid' | 'fern';
}
```

## 5. 关键技术实现

### 5.1 几何体生成策略
- **基座**：CylinderGeometry，低多边形（8-12分段）
- **茎干**：TubeGeometry沿CatmullRom曲线生成，分段数控制在8-16
- **叶片**：LatheGeometry生成基础叶片形状，通过旋转偏移复制分布
- **花朵**：SphereGeometry（低分段8×6）组合花瓣，粒子系统使用Points + BufferGeometry

### 5.2 动画驱动
- GSAP Timeline 管理植物切换的渐隐/渐显序列
- GSAP Tween 驱动生长阶段参数插值（object属性→material.color/geometry.scale）
- 粒子动画：GSAP 控制 position.y 和 material.opacity
- 所有UI交互使用 GSAP ease-in-out 0.2s 缓动

### 5.3 性能优化
- 几何体低分段控制三角形数量<800
- 粒子池复用，总数限制在50以内
- 材质复用，避免频繁创建ShaderMaterial
- 轨道控制器启用阻尼，减少不必要的重绘

### 5.4 响应式UI
- CSS media query 检测屏幕宽度
- 移动端：`position: fixed` 浮动按钮，transform: translate 实现拖动
- 桌面端：左侧固定面板，width: 240px
- 毛玻璃效果：`backdrop-filter: blur(10px)` + 半透明白色背景
