## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "index.html" --> "main.ts"
        "main.ts" --> "starmap.ts"
        "main.ts" --> "uiControls.ts"
        "uiControls.ts --> starmap.ts"
    end

    subgraph "Three.js渲染层"
        "starmap.ts" --> "恒星粒子系统(BufferGeometry+Points)"
        "starmap.ts" --> "星座连线(TubeGeometry+贝塞尔曲线)"
        "starmap.ts" --> "深空标识(Mesh+Sprite)"
        "starmap.ts" --> "CSS2DRenderer标签"
    end

    subgraph "静态数据"
        "stars.json" --> "starmap.ts"
        "constellations.json" --> "starmap.ts"
        "deepsky.json" --> "starmap.ts"
    end
```

## 2. 技术说明

- **前端框架**：TypeScript + Three.js（无React/Vue，纯TS模块化开发）
- **构建工具**：Vite
- **3D渲染**：Three.js + OrbitControls + CSS2DRenderer
- **状态管理**：简易状态对象（starmap内部状态），无第三方状态库
- **后端**：无（纯前端，静态数据内嵌JSON）
- **数据**：内置模拟天文数据（恒星、星座、深空天体）

## 3. 文件结构与调用关系

| 文件 | 职责 | 调用关系 |
|------|------|---------|
| `package.json` | 项目依赖和脚本 | - |
| `vite.config.js` | Vite基础配置 | - |
| `tsconfig.json` | TypeScript严格模式配置 | - |
| `index.html` | 入口HTML，全屏canvas容器 | 引用 `src/main.ts` |
| `src/main.ts` | 应用入口：创建场景/相机/渲染器，初始化OrbitControls，监听resize，初始化StarMap和UIControls | 调用 `starmap.ts`、`uiControls.ts` |
| `src/starmap.ts` | 核心星图层：恒星粒子、星座连线、深空标识，接收焦距和筛选参数更新 | 被 `main.ts` 和 `uiControls.ts` 调用 |
| `src/uiControls.ts` | UI交互：绑定DOM事件，将用户操作转为参数传递给starmap | 调用 `starmap.ts` 的update方法 |
| `src/data/stars.json` | 恒星数据：赤经、赤纬、视星等、光谱类型 | 被 `starmap.ts` 读取 |
| `src/data/constellations.json` | 星座数据：名称、连线恒星索引对 | 被 `starmap.ts` 读取 |
| `src/data/deepsky.json` | 深空天体数据：名称、坐标、类型、描述 | 被 `starmap.ts` 读取 |

### 数据流向

```
用户操作(DOM事件) → uiControls.ts → starmap.update(params) → 更新粒子/连线/标签
                                                ↓
                                    静态JSON数据 → 生成Three.js对象 → 渲染到场景
```

## 4. 关键技术实现

### 4.1 恒星粒子系统
- 使用 `BufferGeometry` + `Points` 实现高性能粒子渲染
- 粒子位置从赤经/赤纬转换为3D笛卡尔坐标（球面投影）
- 颜色使用 `Float32Array` 按光谱类型赋值
- 大小使用 `SizeAttribute` 按视星等计算
- 发光效果使用自定义 `ShaderMaterial` 或圆形sprite纹理

### 4.2 星座连线
- 使用 `QuadraticBezierCurve3` 生成贝塞尔曲线
- 曲线偏移量向球面外侧微凸，营造弧线效果
- 使用 `LineBasicMaterial` 半透明 #80bfff
- Raycaster检测鼠标悬停，CSS2DRenderer显示名称标签

### 4.3 动态视角
- `PerspectiveCamera.fov` 由滑块控制（40°-120°）
- 自动旋转：每帧微调 `scene.rotation.y`
- 暂停恢复：记录最后交互时间，5秒后恢复

### 4.4 双击聚焦
- Raycaster检测双击目标恒星
- `TWEEN` 或自定义插值实现1秒平滑过渡
- 相机位置和lookAt目标同时插值

### 4.5 深空天体
- 星云：圆形 `RingGeometry` + 发光sprite
- 星团：三角形 `ConeGeometry`
- 点击事件通过Raycaster检测，弹出HTML浮层

## 5. 性能策略

- 恒星粒子使用 `BufferGeometry`（非独立Mesh），确保5000+粒子流畅
- 星座连线使用 `Line` 而非 `TubeGeometry`（减少面数）
- CSS2DRenderer仅用于少量标签，避免大量DOM操作
- 深空标识数量控制在20个以内
- 渲染循环使用 `requestAnimationFrame`
- 目标帧率 ≥ 55FPS
