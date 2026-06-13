## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端 (React + Vite)"
        A["App.tsx<br/>路由与状态管理"] --> B["HomePage<br/>时间轴与搜索"]
        A --> C["CreateJournal<br/>创建日志表单"]
        A --> D["JournalDetail<br/>日志详情视图"]
        B --> E["JournalCard<br/>日志卡片组件"]
        B --> F["SearchBar<br/>全局搜索"]
        E --> G["WeatherIcon<br/>气象动画图标"]
        E --> H["MoodTag<br/>心情标签"]
        D --> I["ImageSlider<br/>图片幻灯片"]
        D --> J["BadgeButton<br/>旅行徽章"]
    end
    subgraph "后端 (Express)"
        K["server/index.ts<br/>Express 服务器"]
        K --> L["日志 CRUD API"]
        K --> M["用户系统 API"]
        K --> N["图片上传处理"]
    end
    subgraph "数据存储"
        O["内存数据存储<br/>（JSON 对象）"]
        P["本地文件系统<br/>（上传图片）"]
    end
    A -- "api.ts axios请求" --> K
    K --> O
    K --> P
```

## 2. 技术说明
- **前端**：React@18 + TypeScript + Vite + SCSS + react-router-dom + zustand + axios
- **初始化工具**：vite-init (react-express-ts 模板)
- **后端**：Express + cors + uuid + ts-node
- **数据库**：内存数据存储（JSON 对象），无需外部数据库
- **图片处理**：浏览器端 Canvas API 压缩至 200KB 以内

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| `/` | 首页 - 旅行日志时间轴 |
| `/create` | 创建日志页面 |
| `/journal/:id` | 日志详情页 |

## 4. API 定义

### 4.1 TypeScript 类型定义

```typescript
interface Journal {
  id: string;
  title: string;
  location: string;
  locationType: 'city' | 'mountain' | 'coast' | 'forest' | 'desert';
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  mood: 'happy' | 'calm' | 'thoughtful' | 'nostalgic' | 'surprised' | 'lonely';
  description: string;
  detail: string;
  images: string[];
  badges: number;
  badgeUsers: string[];
  author: string;
  createdAt: string;
}

interface User {
  username: string;
  loginAt: string;
}
```

### 4.2 API 端点

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| GET | `/api/journals` | - | `Journal[]` | 获取所有日志（按时间降序） |
| GET | `/api/journals/:id` | - | `Journal` | 获取单篇日志详情 |
| POST | `/api/journals` | `{ title, location, locationType, weather, mood, description, detail, images, author }` | `Journal` | 创建新日志 |
| POST | `/api/journals/:id/badge` | `{ username }` | `{ badges: number }` | 点亮旅行徽章 |
| POST | `/api/upload` | `FormData (image file)` | `{ url: string }` | 上传图片 |
| POST | `/api/login` | `{ username }` | `{ username, loginAt }` | 用户登录 |
| GET | `/api/user` | - | `User | null` | 获取当前登录用户 |

## 5. 服务器架构图

```mermaid
flowchart LR
    A["Express 路由层<br/>server/index.ts"] --> B["业务逻辑层<br/>CRUD 处理"]
    B --> C["数据存储层<br/>内存 JSON"]
    B --> D["文件存储层<br/>uploads/"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Journal {
        string id PK
        string title
        string location
        string locationType
        string weather
        string mood
        string description
        string detail
        string images
        number badges
        string badgeUsers
        string author
        string createdAt
    }
    User {
        string username PK
        string loginAt
    }
    Journal }o--|| User : "created by"
```

### 6.2 数据流向说明
- **客户端 → 服务器**：用户在创建日志页面填写表单 → api.ts 封装请求 → Express 服务器处理 → 存入内存/文件系统
- **服务器 → 客户端**：首页加载 → api.ts 请求日志列表 → 服务器返回数据 → zustand store 更新 → 组件渲染
- **徽章交互**：用户点击徽章 → api.ts 发送 POST → 服务器检查是否已点过 → 更新徽章数 → 返回新数据 → 组件更新
