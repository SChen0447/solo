## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React 18 + Vite 5)"
        A["Workbench.tsx - 主工作台组件"]
        B["api.ts - API & IndexedDB服务"]
        C["global.css - 全局样式与动画"]
        D["Canvas画板渲染"]
        E["图层管理系统"]
        F["滤镜引擎"]
        G["历史状态管理"]
    end
    subgraph "后端 (Express 4)"
        H["app.ts - 服务入口"]
        I["POST /api/upload - 图片上传"]
        J["POST /api/split - 分割模拟"]
        K["POST /api/export - 图片导出合成"]
    end
    subgraph "数据存储"
        L["IndexedDB - 本地历史记录"]
        M["内存 - 运行时图层状态"]
    end
    A --> B
    B --> H
    A --> D
    A --> E
    A --> F
    A --> G
    B --> L
    I --> J
    J --> K
```

## 2. 技术描述

- **前端**：React@18 + react-dom@18 + TypeScript + Vite@5 + react-router-dom + idb + axios
- **后端**：Express@4 + TypeScript + ts-node + cors + multer + sharp
- **构建工具**：Vite@5
- **本地存储**：IndexedDB（idb库封装）
- **状态管理**：React useState/useReducer（变换历史栈最多15步）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页 - 草稿上传与拼贴工作台 |

## 4. API 定义

### 4.1 上传图片
```typescript
// POST /api/upload
// Content-Type: multipart/form-data
interface UploadResponse {
  success: boolean;
  imageId: string;
  imageUrl: string;
  width: number;
  height: number;
}
```

### 4.2 模拟分割
```typescript
// POST /api/split
interface SplitRequest {
  imageId: string;
  regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'character' | 'background';
  }>;
}

interface SplitResponse {
  success: boolean;
  layers: Array<{
    id: string;
    type: 'character' | 'background';
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    thumbnail: string; // base64
    dataUrl: string;   // base64 原图裁剪
  }>;
}
```

### 4.3 导出分镜
```typescript
// POST /api/export
interface ExportRequest {
  canvasWidth: number;
  canvasHeight: number;
  layers: Array<{
    id: string;
    dataUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale: number;
    filter: string | null;
  }>;
}

interface ExportResponse {
  success: boolean;
  dataUrl: string; // base64 PNG 1920x1080
}
```

### 4.4 IndexedDB 数据模型
```typescript
interface CollageRecord {
  id: string;
  originalImage: string;      // base64
  layers: Layer[];             // JSON序列化
  exportedImage?: string;      // base64
  timestamp: number;
}

interface Layer {
  id: string;
  type: 'character' | 'background';
  name: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  filter: string | null;
}
```

##