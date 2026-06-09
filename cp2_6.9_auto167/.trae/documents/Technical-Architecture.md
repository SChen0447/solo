## 1. 架构设计

```mermaid
graph TD
    subgraph "Frontend (React + TypeScript + Vite)"
        A["App.tsx (主组件)"] --> B["useReducer 状态管理"]
        A --> C["SocketManager (WebSocket连接)"]
        A --> D["Canvas.tsx (画布组件)"]
        D --> E["StickyNote.tsx (便签)"]
        D --> F["ConnectionLine.tsx (连线)"]
        D --> G["参考图片组件"]
        D --> H["协作者光标"]
        I["idGenerator.ts (ID生成)"] --> A
        C --> A
    end

    subgraph "Backend (Express + WebSocket)"
        J["Express HTTP Server (端口3001)"]
        K["WebSocket Server (ws库)"]
        L["房间管理器"]
        M["消息广播"]
        J --> K
        K --> L
        L --> M
    end

    subgraph "通信协议"
        N["WebSocket JSON消息"]
    end

    C <--> N
    M <--> N
```

## 2. 技术描述
- **前端**：React@18 + TypeScript + Vite@5，使用 useReducer 管理画布状态
- **后端**：Express@4 + ws@8 (WebSocket库)
- **通信**：WebSocket 实时双向通信，JSON 序列化消息
- **构建工具**：Vite，代理 /api 和 /ws 到后端 3001 端口
- **样式**：原生 CSS，深色模式，马卡龙色系，毛玻璃效果，平滑过渡动画

## 3. 路由定义
| 路由 | 目的 |
|-------|---------|
| / | 主页面（React SPA入口） |
| /ws | WebSocket 连接端点 |

## 4. API / WebSocket 消息定义

### WebSocket 消息类型

```typescript
// 客户端 → 服务端
type ClientMessage =
  | { type: 'join'; roomId: string; userId: string; nickname: string }
  | { type: 'cursor_move'; roomId: string; userId: string; x: number; y: number }
  | { type: 'add_note'; roomId: string; note: StickyNoteData }
  | { type: 'update_note'; roomId: string; note: StickyNoteData }
  | { type: 'delete_note'; roomId: string; noteId: string }
  | { type: 'add_connection'; roomId: string; connection: ConnectionData }
  | { type: 'delete_connection'; roomId: string; connectionId: string }
  | { type: 'add_image'; roomId: string; image: ImageData }
  | { type: 'update_image'; roomId: string; image: ImageData }
  | { type: 'delete_image'; roomId: string; imageId: string }

// 服务端 → 客户端
type ServerMessage =
  | { type: 'room_state'; notes: StickyNoteData[]; connections: ConnectionData[]; images: ImageData[]; users: User[] }
  | { type: 'user_joined'; user: User }
  | { type: 'user_left'; userId: string }
  | { type: 'cursor_moved'; userId: string; x: number; y: number }
  | { type: 'note_added'; note: StickyNoteData }
  | { type: 'note_updated'; note: StickyNoteData }
  | { type: 'note_deleted'; noteId: string }
  | { type: 'connection_added'; connection: ConnectionData }
  | { type: 'connection_deleted'; connectionId: string }
  | { type: 'image_added'; image: ImageData }
  | { type: 'image_updated'; image: ImageData }
  | { type: 'image_deleted'; imageId: string }

interface User {
  id: string
  nickname: string
  color: string
  x: number
  y: number
}

interface StickyNoteData {
  id: string
  x: number
  y: number
  content: string
  color: string
}

interface ConnectionData {
  id: string
  fromNoteId: string
  toNoteId: string
}

interface ImageData {
  id: string
  x: number
  y: number
  src: string // base64 data URL
  width: number
  height: number
  scale: number
}
```

## 5. 服务端架构

```mermaid
graph TD
    A["WebSocket 连接"] --> B["消息解析"]
    B --> C{"消息类型"}
    C --> D["join → 房间管理器加入房间"]
    C --> E["cursor_move → 广播光标位置"]
    C --> F["add/update/delete → 广播元素变更"]
    D --> G["发送当前房间状态给新用户"]
    E --> H["广播到同房间所有用户"]
    F --> H
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    ROOM ||--o{ USER : has
    ROOM ||--o{ STICKY_NOTE : contains
    ROOM ||--o{ CONNECTION : contains
    ROOM ||--o{ IMAGE : contains
    STICKY_NOTE ||--o{ CONNECTION : "from"
    STICKY_NOTE ||--o{ CONNECTION : "to"

    ROOM {
        string id PK "6位字母数字"
    }
    USER {
        string id PK
        string nickname "最多8字符"
        string color "12色调色板"
        number x "光标X"
        number y "光标Y"
    }
    STICKY_NOTE {
        string id PK
        number x
        number y
        string content
        string color "马卡龙8色"
    }
    CONNECTION {
        string id PK
        string fromNoteId FK
        string toNoteId FK
    }
    IMAGE {
        string id PK
        number x
        number y
        string src "base64"
        number width
        number height
        number scale "0.5-2.0"
    }
```

## 7. 项目文件结构

```
.
├── package.json
├── index.html
├── vite.config.js
├── tsconfig.json
├── server/
│   └── index.ts          # Express+WebSocket服务端
└── src/
    ├── main.tsx          # React入口
    ├── App.tsx           # 主组件（房间连接+状态管理）
    ├── canvas/
    │   ├── Canvas.tsx        # 画布组件
    │   ├── StickyNote.tsx    # 便签组件
    │   └── ConnectionLine.tsx # 连线组件
    └── utils/
        ├── idGenerator.ts    # ID生成工具
        └── socketManager.ts  # WebSocket连接管理
```
