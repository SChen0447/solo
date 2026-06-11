## 1. 架构设计

```mermaid
graph TD
    "App.tsx (全局状态管理)" --> "Toolbar.tsx (工具栏组件)"
    "App.tsx (全局状态管理)" --> "GardenCanvas.tsx (花园画布组件)"
    "App.tsx (全局状态管理)" --> "StatsPanel.tsx (统计面板组件)"
    "Toolbar.tsx (工具栏组件)" -->|"添加元素回调"| "App.tsx (全局状态管理)"
    "GardenCanvas.tsx (花园画布组件)" -->|"选中/移动事件"| "App.tsx (全局状态管理)"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 初始化工具：vite-init
- 状态管理：React useState + useReducer（撤销栈）
- 拖拽库：react-beautiful-dnd
- 后端：无
- 数据库：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主画布页面，包含工具栏、花园画布和统计面板 |

## 4. 数据模型

### 4.1 元素类型定义

```typescript
type ElementType = 'rock' | 'rake' | 'moss';

interface GardenElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  data: RockData | RakeData | MossData;
}

interface RockData {
  points: string; // SVG多边形顶点
  size: number;   // 30-60px
}

interface RakeData {
  arcCount: number;  // 5-8条弧线
  startAngle: number;
  endAngle: number;
}

interface MossData {
  radius: number; // 15-30px
}

interface HistoryEntry {
  elements: GardenElement[];
}
```

### 4.2 状态结构

```typescript
interface AppState {
  elements: GardenElement[];
  selectedId: string | null;
  undoStack: HistoryEntry[]; // 最多10步
  stepCount: number;
}
```

## 5. 文件结构

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    └── components/
        ├── GardenCanvas.tsx
        ├── Toolbar.tsx
        └── StatsPanel.tsx
```
