## 1. 架构设计

```mermaid
graph TD
    subgraph "用户界面层"
        HTML["index.html (全屏容器+GUI锚点)"]
        CSS["style (深海暗色主题+毛玻璃面板)"]
    end
    subgraph "应用入口层"
        Main["main.ts (场景初始化+动画循环)"]
    end
    subgraph "核心模块层"
        Thermal["thermal.ts (热泉喷口+烟柱粒子)"]
        Organisms["organisms.ts (管虫+微生物席+虾群)"]
        GUI["gui.ts (dat.GUI参数控制)"]
    end
    subgraph "Three.js引擎层"
        THREE["three.js (渲染器/场景/相机)"]
        Buffer["BufferGeometry (性能优化)"]
        Controls["OrbitControls (交互控制)"]
    end
    
    HTML --> Main
    Main --> Thermal
    Main --> Organisms
    Main --> GUI
    GUI -- 参数事件 --> Thermal
    GUI -- 参数事件 --> Organisms
    Thermal --> THREE
    Organisms --> THREE
    Main --> THREE
    Main --> Controls
    Organisms --> Buffer
    Thermal --> Buffer
```

## 2. 技术描述
- 前端：TypeScript + Three.js + Vite
- 构建工具：Vite（端口8080）
- UI库：dat.GUI（参数控制面板）
- 状态管理：模块内部状态，通过GUI回调传递参数
- 无后端，纯前端3D可视化

## 3. 文件结构与调用关系

| 文件 | 职责 | 依赖/调用 |
|------|------|----------|
| package.json | 依赖配置与启动脚本 | three, @types/three, typescript, vite, dat.gui, @types/dat.gui |
| vite.config.js | Vite构建配置（端口8080） | - |
| tsconfig.json | TypeScript严格模式配置 | - |
| index.html | 入口页面（#app容器+#gui-container锚点） | 引入src/main.ts |
| src/main.ts | 场景初始化：WebGLRenderer/Scene/PerspectiveCamera/OrbitControls/动画循环；组装thermal、organisms、gui模块；处理鼠标悬停交互 | thermal.ts, organisms.ts, gui.ts |
| src/thermal.ts | 热泉喷口岩石几何体；Points粒子系统（BufferGeometry）；粒子生命周期（位置/颜色/透明度/大小更新）；导出createThermalVents()和updateThermal() | three (BufferGeometry/PointsMaterial) |
| src/organisms.ts | 管虫群（合并几何体+摆动动画）；微生物席（ShaderMaterial波动）；虾群（合并几何体+游动动画）；悬停发光材质切换；导出createOrganisms()和updateOrganisms() | three (BufferGeometryUtils.mergeGeometries) |
| src/gui.ts | dat.GUI实例创建；温度梯度/生物密度/视角模式控件；视角平滑过渡tween；导出createGUI() | dat.gui, three（相机tween） |

## 4. 数据流向

```mermaid
sequenceDiagram
    participant User as 用户
    participant GUI as gui.ts
    participant Main as main.ts
    participant Thermal as thermal.ts
    participant Organisms as organisms.ts
    participant Three as Three.js
    
    User->>GUI: 调节温度梯度滑条
    GUI->>Thermal: onTemperatureChange(value)
    Thermal->>Thermal: 更新粒子颜色过渡速率
    GUI->>Organisms: onTemperatureChange(value)
    Organisms->>Organisms: 更新生物分布半径
    
    User->>GUI: 切换视角模式
    GUI->>Main: tweenCamera(targetPos, targetLook)
    Main->>Three: 相机平滑插值
    
    Main->>Thermal: update(delta, params)
    Thermal->>Three: 更新粒子position/color属性
    Main->>Organisms: update(delta, params)
    Organisms->>Three: 更新生物动画矩阵
    
    User->>Main: 鼠标移动
    Main->>Three: Raycaster.intersectObjects()
    Three-->>Main: 命中生物对象
    Main->>Organisms: setHovered(object, true)
    Organisms->>Three: 切换emissive材质
```

## 5. 性能优化策略
1. **粒子系统**：使用BufferGeometry，所有粒子共享PointsMaterial，单DrawCall
2. **生物合并**：同类生物使用BufferGeometryUtils.mergeGeometries合并为单个网格
3. **动画优化**：通过更新BufferGeometry的attribute而非逐个修改Object3D.matrix
4. **DrawCall控制**：粒子≤500，生物总数≤200，合并后DrawCall≤10
5. **材质复用**：同类生物共享材质实例，仅通过vertex color区分个体差异
