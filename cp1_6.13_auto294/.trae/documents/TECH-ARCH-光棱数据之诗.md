## 1. 架构设计

```mermaid
graph TD
    subgraph "用户层"
        A["浏览器"]
    end
    
    subgraph "渲染层"
        B["WebGL渲染器<br/>THREE.WebGLRenderer"]
        C["后处理通道<br/>EffectComposer + UnrealBloomPass"]
    end
    
    subgraph "场景层"
        D["3D场景<br/>THREE.Scene"]
        E["透视相机<br/>THREE.PerspectiveCamera"]
        F["轨道控制器<br/>OrbitControls"]
    end
    
    subgraph "可视化层 (src/visualizer.ts)"
        G["人体棱线模型<br/>180×LineSegments"]
        H["数据映射引擎<br/>数值→视觉属性"]
        I["交互检测<br/>Raycaster +