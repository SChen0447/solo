## 1. 架构设计

```mermaid
graph TD
    "A[index.html 入口页面]" --> "B[src/main.ts 入口逻辑]"
    "B" --> "C[UI层: 参数面板/选项卡/滑块/按钮]"
    "B" --> "D[src/illusionEngine.ts 渲染引擎]"
    "D" --> "E[Canvas 2D Context]"
    "C" --> "F[参数状态管理]"
    "F" --> "D"
    "D" --> "G[requestAnimationFrame 循环]"
    "G" --> "E"
```

## 2. 技术描述
- **前端**：原生TypeScript + Vite + HTML5 Canvas 2D API（无外部图形库/框架）
- **构建工具**：Vite 5.x，输出目录dist，端口5173，开启HMR
- **语言标准**：TypeScript严格模式，target ES2020，module ESNext
- **渲染性能**：requestAnimationFrame驱动，目标60FPS，单帧主线程阻塞≤16ms

## 3. 文件结构
| 文件 | 用途 |
|------|------|
| package.json | 依赖typescript、vite，启动脚本npm run dev |
| vite.config.js | 基础Vite配置：root、build.outDir=dist、server.port=5173、hmr |
| tsconfig.json | 严格模式、target ES2020、module ESNext |
| index.html | 入口页面：全屏Canvas、背景#1a1a1a、引入main.ts |
| src/main.ts | 入口文件：Canvas初始化、UI构建、参数监听、调用渲染引擎 |
| src/illusionEngine.ts | 核心渲染引擎：三种视错觉图案渲染算法 |

## 4. 核心类型定义
```typescript
type IllusionType = 'rotatingSnake' | 'hermannGrid' | 'flickeringTop';

interface RenderParams {
  scale: number;           // 0.5 - 2.0, 步长 0.1
  rotationSpeed: number;   // 0 - 10, 步长 0.5, 度/帧
  saturation: number;      // 0 - 100, 步长 1
  contrast: number;        // 0 - 100, 步长 1
  complexity: number;      // 3 - 20, 步长 1
  flickerFrequency: number; // 0 - 10, 步长 0.5, Hz
}

interface IllusionEngine {
  setCanvas(canvas: HTMLCanvasElement): void;
  setParams(params: Partial<RenderParams>): void;
  setIllusionType(type: IllusionType): void;
  start(): void;
  stop(): void;
  renderFrame(time: number): void;
  exportPNG(): Promise<Blob>;
}
```

## 5. 渲染引擎架构
```mermaid
graph TD
    "A[illusionEngine.ts]" --> "B[renderFrame 分发]"
    "B" --> "C[renderRotatingSnake 旋转蛇]"
    "B" --> "D[renderHermannGrid 赫尔曼栅格]"
    "B" --> "E[renderFlickeringTop 闪烁陀螺]"
    "C" --> "F[Canvas 2D 绘制: arc/fill/径向渐变]"
    "D" --> "F"
    "E" --> "F"
    "G[参数对象 RenderParams]" --> "B"
    "H[时间/帧计数]" --> "B"
```

### 5.1 三种视错觉算法
1. **旋转蛇错觉**：多层同心圆环，每层由扇形色块交替排列，相邻圆环扇形相位偏移固定角度，整体缓慢旋转产生运动错觉
2. **赫尔曼栅格错觉**：深色背景上绘制等间距白色方格矩阵，交叉点处通过径向渐变叠加灰暗色模拟闪烁灰斑效果
3. **闪烁陀螺错觉**：多组放射状黑白条纹从中心向外延伸，不同图层以不同速度反向旋转，叠加高对比度闪烁频率

## 6. 性能优化策略
- 使用requestAnimationFrame而非setInterval确保60FPS同步
- 参数变化写入状态对象，下一帧渲染时读取，避免同步阻塞
- 图案切换使用Canvas globalAlpha实现0.5秒淡入淡出，避免重建DOM
- 窗口resize使用100ms防抖，避免频繁重排
- 优先使用Canvas 2D原生路径绘制（arc、fillRect等），避免逐像素操作
- FPS计数器使用moving average平滑显示
