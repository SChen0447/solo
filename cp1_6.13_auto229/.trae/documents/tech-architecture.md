## 1. 架构设计

```mermaid
flowchart TB
    subgraph Frontend["前端 (React + TypeScript + Vite)"]
        A["App.tsx - 主界面布局与全局状态"]
        B["Card.tsx - 卡片渲染与交互"]
        C["Zustand Store - 状态管理"]
    end
    subgraph Backend["后端 (Node.js + Express)"]
        D["server.ts - RESTful API"]
        E["Multer - 文件上传中间件"]
        F["内存存储 - 卡片数据与文件"]
    end
    A --> C
    B --> C
    A --> B
    Frontend -->|"/api 代理"| Backend
    D --> E
    D --> F
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 初始化工具：vite-init (react-express-ts 模板)
- 后端：Express + TypeScript（ESM格式）
- 数据库：无，使用内存存储（Map结构）
- 状态管理：Zustand
- 文件上传：Multer（处理音频和图片）
- ID生成：uuid

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 档案室主界面（含登录/注册） |

## 4. API定义

### 4.1 认证相关

```typescript
interface User {
  id: string;
  username: string;
  password: string;
}

POST /api/auth/register
  Request: { username: string; password: string }
  Response: { user: { id: string; username: string }; token: string }

POST /api/auth/login
  Request: { username: string; password: string }
  Response: { user: { id: string; username: string }; token: string }
```

### 4.2 卡片相关

```typescript
interface Card {
  id: string;
  userId: string;
  type: "image" | "text" | "audio";
  title: string;
  content: string;
  tags: string[];
  positionX: number;
  positionY: number;
  createdAt: string;
}

GET /api/cards?userId=&tag=&sort=
  Response: Card[]

POST /api/cards
  Request: Omit<Card, "id" | "createdAt">
  Response: Card

PUT /api/cards/:id
  Request: Partial<Card>
  Response: Card

DELETE /api/cards/:id
  Response: { success: boolean }

POST /api/cards/:id/upload
  Request: FormData (file field)
  Response: { url: string }
```

### 4.3 标签相关

```typescript
GET /api/tags?userId=
  Response: string[]
```

## 5. 服务器架构图

```mermaid
flowchart LR
    A["Express Router"] --> B["Auth Controller"]
    A --> C["Card Controller"]
    A --> D["Upload Controller"]
    B --> E["内存用户存储"]
    C --> F["内存卡片存储"]
    D --> G["Multer 中间件"]
    G --> H["本地文件系统"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    User ||--o{ Card : "拥有"
    User {
        string id PK
        string username
        string password
    }
    Card {
        string id PK
        string userId FK
        string type
        string title
        string content
        string tags
        number positionX
        number positionY
        string createdAt
    }
```

### 6.2 数据存储

- 用户数据：`Map<string, User>` 内存存储
- 卡片数据：`Map<string, Card>` 内存存储
- 上传文件：存储在本地 `uploads/` 目录
