## 1. 架构设计

```mermaid
graph TD
    "浏览器" --> "Vite Dev Server"
    "Vite Dev Server" --> "index.html 入口页面"
    "index.html" --> "main.ts 主入口"
    "main.ts" --> "Three.js 3D场景"
    "main.ts" --> "AudioAnalyser 音频分析"
    "main.ts" --> "ParticleSystem 粒子系统"
    "main.ts" --> "UI 控制层"
    "AudioAnalyser" -->|"频谱数据"| "ParticleSystem"
    "UI 控制层" -->|"播放/暂停/音量"| "AudioAnalyser"
    "UI 控制层" -->|"视角/显示切换"| "Three.js 3D场景"
```

## 2. 技术说明

- **前端**：TypeScript 5 + Vite 5 + Three.js 0.160
- **初始化工具**：Vite vanilla-ts 模板
- **UI层**：原生HTML/CSS + TypeScript
- **音频处理**：Web Audio API (AudioContext, AnalyserNode)
- **3D渲染**：Three.js (BufferGeometry, Points, LineSegments, OrbitControls)
- **工具库**：lodash, uuid
- **类型定义**：@types/three

## 3. 目录结构

```
project-root/
├── index.html                 # 入口HTML页面
├── package.json               # 项目依赖
├── tsconfig.json              # TypeScript配置
├── vite.config.js             # Vite构建配置
└── src/
    ├── main.ts                # 应用入口，Three.js初始化
    ├── AudioAnalyser.ts       # 音频上传、解码、频谱分析
    └── ParticleSystem.ts      # 粒子系统，频谱数据驱动
```

## 4. 核心模块设计

### 4.1 AudioAnalyser 模块

| 方法/属性 | 类型 | 说明 |
|-----------|------|------|
| `audioContext` | AudioContext | Web Audio上下文 |
| `analyser` | AnalyserNode | 频谱分析节点 |
| `source` | AudioBufferSourceNode | 音频源节点 |
| `gainNode` | GainNode | 音量控制节点 |
| `uploadAndDecode(file)` | Promise<void> | 上传并解码音频文件 |
| `play()` | void | 播放音频 |
| `pause()` | void | 暂停音频 |
| `setVolume(v)` | void | 设置音量0-1 |
| `getFrequencyData()` | Uint8Array | 获取当前频域数据 |
| `getCurrentTime()` | number | 获取当前播放时间 |
| `getDuration()` | number | 获取音频总时长 |
| `onEnded(callback)` | void | 播放结束回调 |

### 4.2 ParticleSystem 模块

| 方法/属性 | 类型 | 说明 |
|-----------|------|------|
| `points` | Points | Three.js粒子对象 |
| `lines` | LineSegments | 连接线对象(可选) |
| `particleCount` | number | 粒子数量 |
| `showLines` | boolean | 是否显示连接线 |
| `update(freqData, dt)` | void | 根据频谱数据更新粒子 |
| `setShowLines(enabled)` | void | 切换连接线显示 |
| `setParticleCount(n)` | void | 动态调整粒子数量 |
| `dispose()` | void | 释放资源 |

### 4.3 主入口 main.ts

负责：
- 初始化Three.js场景、相机、渲染器
- 创建背景星点
- 实例化AudioAnalyser和ParticleSystem
- 处理用户交互(OrbitControls, 键盘事件)
- 实现UI上传、播放控制逻辑
- 响应窗口大小变化和性能自适应
- 主渲染循环

## 5. 性能优化策略

1. **粒子使用BufferGeometry**：避免每帧重建Geometry，直接操作position/color attribute数组
2. **连接线空间哈希**：用空间网格加速邻近粒子查找，避免O(n²)距离计算
3. **帧率自适应**：监测FPS，动态降低粒子数或关闭连接线
4. **频谱数据降采样**：AnalyserNode fftSize=256，获取128个频段数据，映射到粒子环带
5. **GPU instancing**：使用Points而非Mesh，利用GPU批量渲染
6. **材质复用**：共享ShaderMaterial/PointsMaterial实例
