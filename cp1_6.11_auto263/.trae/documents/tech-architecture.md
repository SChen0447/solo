## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端 (React + TypeScript + Vite)"
        "A[App.tsx<br/>状态管理+事件监听]"
        "B[sprayCanvas.ts<br/>涂鸦渲染引擎]"
        "C[WebSocket Client<br/>实时通信]"
    end
    subgraph "后端 (Express + ws)"
        "D[Express Server<br/>HTTP API"]
        "E[WebSocket Server<br/>实时广播]"
        "F[涂鸦历史存储<br/>内存数据结构]"
    end
    "A" --> "B"
    "A" --> "C"
    "C" <--> "E"
    "D" --> "F"
    "E" --> "F"
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Vite@5 + @vitejs/plugin-react
- 后端：Express@4 + ws（WebSocket）
- 状态管理：React useState/useRef（无需全局状态库）
- 构建工具：Vite@5，开发时代理到后端端口3001
- 无数据库，涂鸦历史存储在服务端内存中

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 涂鸦墙主界面 |

## 4. API 定义

### 4.1 HTTP 接口
| 方法 | 路径 | 描述 | 请求 | 响应 |
|------|------|------|------|------|
| GET | /api/history | 获取涂鸦历史记录 | - | `{ records: SprayRecord[] }` |
| GET | /api/online-count | 获取在线人数 | - | `{ count: number }` |

### 4.2 WebSocket 消息类型

**客户端 → 服务端**
```typescript
interface ClientMessage {
  type: 'spray';
  payload: {
    x: number;
    y: number;
    color: string;
    nozzleSize: number;
    pressure: number;
    timestamp: number;
    userId: string;
    nickname: string;
  };
}

interface ClientMessage {
  type: 'cursor';
  payload: {
    x: number;
    y: number;
    userId: string;
    nickname: string;
    color: string;
  };
}
```

**服务端 → 客户端**
```typescript
interface ServerMessage {
  type: 'spray';
  payload: SprayPayload;
}

interface ServerMessage {
  type: 'cursor';
  payload: CursorPayload;
}

interface ServerMessage {
  type: 'online-count';
  payload: { count: number };
}

interface ServerMessage {
  type: 'history';
  payload: { records: SprayRecord[] };
}
```

### 4.3 数据类型
```typescript
interface SprayRecord {
  id: string;
  userId: string;
  nickname: string;
  color: string;
  colorName: string;
  x: number;
  y: number;
  nozzleSize: number;
  pressure: number;
  timestamp: number;
}

interface SprayPoint {
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  timestamp: number;
}

interface DripLine {
  startX: number;
  startY: number;
  length: number;
  angle: number;
  color: string;
  opacity: number;
}

interface PaintLayer {
  points: SprayPoint[];
  drips: DripLine[];
  timestamp: number;
  initialColor: string;
  currentColor: string;
  saturation: number;
  overlapCount: Map<string, number>;
  elevatedAreas: Set<string>;
}
```

## 5. 服务端架构图

```mermaid
flowchart LR
    "A[Express Router<br/>/api/history<br/>/api/online-count]" --> "B[WebSocket Handler<br/>连接管理+广播]"
    "B" --> "C[History Store<br/>内存数组存储]"
    "A" --> "C"
```

## 6. 文件结构

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
├── server/
│   └── server.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── tools/
│       └── sprayCanvas.ts
```
