## 1. 架构设计

```mermaid
flowchart TD
    "A[React 前端应用]" --> "B[App.tsx 状态管理]"
    "B" --> "C[Canvas.tsx 画布组件]"
    "B" --> "D[Toolbar.tsx 工具栏组件]"
    "B" --> "E[useHistory.ts 撤销/重做Hook]"
    "C" --> "F[图层渲染与交互]"
    "D" --> "G[图层列表管理]"
    "D" --> "H[操作按钮组]"
    "E" --> "I[快照栈管理]"
```

## 2. 技术说明

- 前端：React 18 + TypeScript + Vite
- 初始化工具：vite-init（react-ts 模板）
- 状态管理：React useState/useReducer（通过props传递）
- 后端：无
- 数据库：无
- 依赖：react、react-dom、typescript、vite、@vitejs/plugin-react、uuid

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 编辑器主页面 |

## 4. 数据模型

### 4.1 核心类型定义

```typescript
interface Layer {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  // 图片图层特有
  imageUrl?: string;
  imageElement?: HTMLImageElement;
  // 文字图层特有
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
}

enum ActionType {
  ADD_LAYER = 'ADD_LAYER',
  MOVE_LAYER = 'MOVE_LAYER',
  DELETE_LAYER = 'DELETE_LAYER',
  EDIT_TEXT = 'EDIT_TEXT',
  REORDER_LAYER = 'REORDER_LAYER',
  RESIZE_LAYER = 'RESIZE_LAYER',
  ROTATE_LAYER = 'ROTATE_LAYER',
}
```

### 4.2 文件结构

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types.ts
    ├── hooks/
    │   └── useHistory.ts
    └── components/
        ├── Canvas.tsx
        └── Toolbar.tsx
```

## 5. 关键技术方案

### 5.1 画布交互

- 使用CSS `transform` 实现拖动/缩放/旋转，避免重绘开销
- 拖拽上传：监听 `dragover`/`drop` 事件，`FileReader` 读取图片
- 缩放：鼠标滚轮 + 角落拖拽手柄
- 旋转：旋转手柄拖拽计算角度

### 5.2 图层管理

- 图层列表按 `zIndex` 排序
- 选中图层时 `zIndex` 提升至最高
- 上下移动：交换相邻图层 `zIndex`

### 5.3 撤销/重做

- 每次操作生成图层列表深拷贝快照
- 撤销栈最大30项，超出时丢弃最早快照
- 新操作清空重做栈

### 5.4 导出PNG

- 创建离屏Canvas，2倍分辨率绘制
- 按 `zIndex` 顺序绘制所有图层
- `canvas.toBlob()` → `URL.createObjectURL()` → 触发下载
- 进度条模拟：按图层数量分步更新

### 5.5 动画方案

- 拖动弹性跟随：CSS `transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- 图层选中光晕：`box-shadow` + CSS `animation` 脉冲效果
- 删除动画：`transform: scale(0)` + `opacity: 0`，0.3秒过渡
- 撤销淡入：`opacity` 0.15秒过渡
- 文字字体切换：`opacity` 0.1秒淡入
