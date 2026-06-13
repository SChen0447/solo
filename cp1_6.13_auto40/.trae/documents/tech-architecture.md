## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "index.html" --> "main.ts"
        "main.ts" --> "strokes.ts"
        "main.ts" --> "animation.ts"
    end
    subgraph "渲染层"
        "animation.ts" --> "HTML5 Canvas"
        "main.ts" --> "DOM事件绑定"
    end
    subgraph "数据层"
        "strokes.ts" --> "笔画坐标数据"
        "strokes.ts" --> "贝塞尔曲线定义"
    end
```

## 2. 技术说明

- 前端框架：纯 TypeScript + HTML5 Canvas（无React/Vue，保持轻量）
- 构建工具：Vite
- 动画驱动：requestAnimationFrame
- 初始化工具：npm init vite-init
- 后端：无
- 数据库：无（笔画数据内置于strokes.ts）

## 3. 文件结构

| 文件路径 | 用途 |
|----------|------|
| package.json | 项目依赖（typescript、vite）与启动脚本 |
| index.html | 入口页面，全屏容器，加载毛笔图标旋转动画 |
| tsconfig.json | TypeScript配置，严格模式，ES模块目标 |
| vite.config.js | 构建配置，指向index.html |
| src/main.ts | 应用入口，初始化Canvas、绑定事件、调用模块 |
| src/strokes.ts | 笔画数据定义与解析，二次贝塞尔曲线坐标 |
| src/animation.ts | 动画引擎，逐帧绘制，速度调节，开始/暂停/重置 |

## 4. 模块设计

### 4.1 strokes.ts 笔画数据模块

- 定义 `StrokePoint` 类型：`{ x: number, y: number }`
- 定义 `StrokeSegment` 类型：二次贝塞尔曲线段，包含起点、控制点、终点
- 定义 `Stroke` 类型：由多个 `StrokeSegment` 组成的完整笔画
- 定义 `CharacterStrokes` 类型：一个汉字的所有笔画集合，按标准笔顺排列
- 内置常用汉字（永、安、龙等）的笔画数据
- 提供 `getCharacterStrokes(char: string): CharacterStrokes | null` 查询接口

### 4.2 animation.ts 动画引擎模块

- `AnimationEngine` 类：
  - 属性：canvas、ctx、当前笔画索引、进度、速度倍率、笔触颜色、动画状态
  - `start()`: 开始动画
  - `pause()`: 暂停动画
  - `reset()`: 重置画布和状态
  - `setSpeed(multiplier: number)`: 设置速度倍率（0.5-3.0）
  - `setColor(color: string)`: 设置笔触颜色
  - 内部使用 requestAnimationFrame 驱动逐帧绘制
  - 笔锋效果：根据笔画进度t动态计算线宽，使用正弦曲线模拟从细到粗再到细
  - 笔尖闪烁：在当前笔画末端绘制闪烁红色圆点
  - 已完成笔画以70%透明度重绘

### 4.3 main.ts 应用入口

- DOM加载完成后初始化Canvas
- 绑定输入框input事件，检测汉字输入并触发动画
- 绑定速度滑块change事件
- 绑定颜色选择器click事件
- 绑定重置按钮click事件
- 限制输入最多5个汉字

## 5. 核心算法

### 5.1 贝塞尔曲线绘制算法

沿二次贝塞尔曲线按参数t采样点，每帧递增t值，根据t计算当前线宽：

```
lineWidth = baseWidth * sin(t * PI) * 0.6 + baseWidth * 0.4
```

这实现了从细（t=0）到粗（t=0.5）再收细（t=1）的毛笔锋效果。

### 5.2 动画帧调度

每帧计算deltaTime，根据速度倍率调整笔画进度增量，确保不同速度下动画流畅无卡顿。笔画间插入0.5秒等待期。
