## 1. 架构设计

```mermaid
flowchart TB
    "Browser" --> "MediaDevices API"
    "MediaDevices API" --> "Camera Stream"
    "Camera Stream" --> "FaceMesh (CDN)"
    "FaceMesh (CDN)" --> "468 Facial Landmarks"
    "468 Facial Landmarks" --> "Expression Classifier"
    "Expression Classifier" --> "Expression Status"
    "Expression Status" --> "Character Renderer"
    "Character Renderer" --> "Canvas 2D"
    "Expression Status" --> "UI Controller"
    "UI Controller" --> "HTML DOM Updates"
    "User Interaction" --> "Recording System"
    "Recording System" --> "Playback System"
    "Playback System" --> "Character Renderer"
```

## 2. 技术描述
- **前端框架**：原生 TypeScript（不使用 React/Vue 等框架）
- **构建工具**：Vite 5.x
- **渲染技术**：HTML5 Canvas 2D 原生 API
- **人脸检测**：MediaPipe FaceMesh（通过 CDN 加载 @mediapipe/face_mesh + @mediapipe/camera_utils）
- **语言**：TypeScript 严格模式
- **目标环境**：现代浏览器（支持 getUserMedia API 和 WebGL）

## 3. 文件结构
```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.ts              # 程序入口，初始化摄像头、FaceMesh、动画循环
    ├── faceMeshDetector.ts  # FaceMesh模型加载、关键点检测、表情分类
    ├── characterRenderer.ts # Canvas卡通角色绘制、表情参数渲染
    └── uiController.ts      # 界面管理：摄像头显示、录制、表情指示灯
```

## 4. 核心类型定义

```typescript
type ExpressionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'disgusted' | 'neutral';

interface ExpressionWeights {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  disgusted: number;
  neutral: number;
}

interface CharacterStatus {
  expression: ExpressionType;
  eyeScale: number;      // 0.6 ~ 1.5
  mouthCurve: number;    // -15° ~ +角度
  browAngle: number;     // -20° ~ +角度
  browYOffset: number;   // 眉毛垂直偏移
  cheekBlush: number;    // 0 ~ 0.4 透明度
}

interface RecordedFrame {
  timestamp: number;
  status: CharacterStatus;
}
```

## 5. 模块接口定义

### faceMeshDetector.ts
```typescript
class FaceMeshDetector {
  async startDetection(videoElement: HTMLVideoElement): Promise<void>;
  getCurrentExpression(): ExpressionWeights;
  onResults(callback: (landmarks: any) => void): void;
  destroy(): void;
}
```

### characterRenderer.ts
```typescript
class CharacterRenderer {
  constructor(canvas: HTMLCanvasElement);
  drawCharacter(status: CharacterStatus): void;
}
```

### uiController.ts
```typescript
class UIController {
  constructor(
    videoEl: HTMLVideoElement,
    recordBtn: HTMLElement,
    indicatorContainer: HTMLElement
  );
  updateExpressionIndicators(expression: ExpressionType): void;
  isRecording(): boolean;
  startRecording(): void;
  stopRecording(): RecordedFrame[];
  playRecording(frames: RecordedFrame[], callback: (status: CharacterStatus) => void): void;
}
```

## 6. 性能指标
- 表情识别帧率：≥15fps
- 角色动画帧率：≥30fps
- 首帧识别延迟：≤3秒（从摄像头开启起）
- 表情过渡动画：0.3秒，ease-in-out缓动

## 7. 外部依赖
- FaceMesh模型：通过CDN加载 `@mediapipe/face_mesh` 和 `@mediapipe/camera_utils`
- 无其他外部动画或游戏框架依赖
