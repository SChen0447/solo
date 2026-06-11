## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        "index.html" --> "main.ts"
        "main.ts" --> "planetManager.ts"
        "main.ts" --> "nebulaManager.ts"
        "main.ts" --> "Tweakpane控制面板"
        "planetManager.ts" --> "atmosphere.vert/frag"
        "planetManager.ts" --> "nebulaManager.ts"
    end
    subgraph "数据流"
        "Tweakpane滑块" -->|"板块应力/火山活动/风力侵蚀"| "main.ts"
        "main.ts" -->|"应力值"| "planetManager.ts"
        "main.ts" -->|"侵蚀值"| "nebulaManager.ts"
        "planetManager.ts" -->|"地形高度变化"| "nebulaManager.ts"
    end
    subgraph "渲染层"
        "planetManager.ts" --> "Three.js Scene"
        "nebulaManager.ts" --> "Three.js Scene"
        "CSS2DRenderer" --> "标注信息"
    end
```

## 2. 技术说明

- **前端**：TypeScript + Three.js@0.160.0 + Vite（纯前端，无后端）
- **构建工具**：Vite，启用TypeScript，设置resolve.alias（@→src）
- **UI控件**：Tweakpane（参数滑块面板）
- **动画**：GSAP（地形过渡、交互反馈）
- **3D渲染**：Three.js（球体网格、粒子系统、自定义着色器、CSS2DRenderer）
- **无后端/无数据库**

## 3. 文件结构与调用关系

| 文件路径 | 职责 | 调用关系 |
|----------|------|----------|
| package.json | 依赖管理，启动脚本 | - |
| vite.config.js | Vite构建配置，alias设置 | - |
| tsconfig.json | TypeScript严格模式配置 | - |
| index.html | 入口HTML，全屏无滚动 | 引用main.ts |
| src/main.ts | 场景/相机/控制器初始化，Tweakpane参数分发 | → planetManager, nebulaManager |
| src/planetManager.ts | 球体网格生成，顶点高度修改，地形动画 | ← main.ts, → nebulaManager |
| src/nebulaManager.ts | 星云粒子系统，粒子浓度/旋转/颜色 | ← main.ts, ← planetManager |
| src/shaders/atmosphere.vert | 大气辉光顶点着色器 | ← planetManager |
| src/shaders/atmosphere.frag | 大气辉光片元着色器 | ← planetManager |

### 数据流向

```
Tweakpane滑块变化
    ├── 板块应力值 ──→ main.ts ──→ planetManager.updateTectonicStress()
    │                                       ├── gsap动画驱动顶点位移
    │                                       ├── 重计算法线
    │                                       └── 通知nebulaManager.updatePosition()
    ├── 火山活动值 ──→ main.ts ──→ planetManager.updateVolcanicActivity()
    │                                       ├── 随机隆起顶点
    │                                       └── 重计算法线
    └── 风力侵蚀值 ──→ main.ts ──→ planetManager.updateErosion() + nebulaManager.updateErosion()
                                            ├── 峡谷切割深度
                                            └── 粒子旋转速度/透明度/大小
```

## 4. 关键技术实现

### 4.1 星球地形生成

- SphereGeometry(1, 64, 64) 生成基础球体，约16384个顶点
- 使用Simplex Noise或多层正弦波叠加生成地形高度
- 板块应力：沿经线方向创建山脉脊线，高度0-0.3单位
- 火山活动：随机选取顶点区域隆起，幅度与参数成正比
- 风力侵蚀：沿纬线方向切割峡谷，深度与参数成正比

### 4.2 星云粒子系统

- PointsMaterial + BufferGeometry，500-800粒子单次绘制
- 粒子位置：球体外围环形区域（半径1.2-2.0）
- 颜色：#FF6B6B→#4ECDC4随机插值
- 旋转：基础0.01弧度/秒 + 风力侵蚀0-0.05弧度/秒加速
- 边缘发光：使用自定义粒子纹理或AdditiveBlending

### 4.3 大气辉光着色器

- 顶点着色器：传递法线和视角方向
- 片元着色器：基于菲涅尔效应计算边缘光晕强度
- 颜色：#87CEEB→透明径向渐变
- 厚度：边缘2px等效

### 4.4 交互系统

- Raycaster射线检测星球表面点击
- CSS2DRenderer渲染标注信息框
- 轨道控制器：OrbitControls，minDistance 0.5，maxDistance 3.0
- 鼠标悬停：高亮边缘描边

### 4.5 性能优化

- 背面剔除：THREE.FrontSide
- 粒子单次绘制调用
- 顶点数≤16384
- requestAnimationFrame驱动渲染循环
- 60FPS目标
