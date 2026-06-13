## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层 (React + TypeScript + Vite)"
        A["index.html<br/>（入口页+沙漏动画）"] --> B["App.tsx<br/>（路由管理+全局布局）"]
        B --> C["组件层"]
        C --> C1["CapsuleEditor.tsx<br/>（信件编辑器）"]
        C --> C2["CapsuleTimeline.tsx<br/>（时间轴+虚拟滚动）"]
        C --> C3["LoginPage.tsx<br/>（登录页）"]
        C --> C4["RegisterPage.tsx<br/>（注册页）"]
        C --> C5["ReaderPage.tsx<br/>（阅读页）"]
        C --> C6["Notification.tsx<br/>（新胶囊通知）"]
        B --> D["服务层"]
        D --> D1["axios拦截器<br/>（JWT自动携带）"]
        D --> D2["api.ts<br/>（API封装）"]
    end

    subgraph "后端层 (Node.js + Express + TypeScript)"
        E["app.ts<br/>（Express服务器+端口3001）"] --> F["中间件层"]
        F --> F1["cors<br/>（跨域处理）"]
        F --> F2["JWT认证中间件"]
        E --> G["路由层"]
        G --> G1["/api/auth<br/>（注册/登录）"]
        G --> G2["/api/capsules<br/>（胶囊CRUD）"]
        G --> G3["/api/user<br/>（用户信息）"]
        E --> H["定时任务"]
        H --> H1["node-cron<br/>（每日0点执行）"]
        H --> H2["匹配发送服务"]
    end

    subgraph "数据层 (内存存储 + 加密)"
        I["models.ts<br/>（数据模型定义）"] --> J["User模型"]
        I --> K["Capsule模型"]
        L["crypto-js<br/>（AES加密信件内容）"] --> K
        M["bcryptjs<br/>（密码哈希）"] --> J
    end

    subgraph "外部依赖"
        N["jsonwebtoken<br/>（JWT令牌）"]
        O["uuid<br/>（ID生成）"]
        P["node-cron<br/>（定时任务）"]
    end

    D -->|HTTP请求| G
    H -->|查询/更新| K
```

## 2. 技术描述

### 2.1 技术栈选型

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端构建 | Vite | 5.x | 快速构建工具，代码分割，热更新 |
| 前端框架 | React | 18.x | UI框架，Hooks，Suspense懒加载 |
| 前端语言 | TypeScript | 5.x | 类型安全，开发体验优化 |
| 路由 | react-router-dom | 6.x | 单页路由管理 |
| HTTP客户端 | axios | 1.x | 请求拦截，自动携带JWT |
| JWT解析 | jwt-decode | 4.x | 前端解析JWT令牌 |
| 后端框架 | Express | 4.x | RESTful API服务器 |
| 后端语言 | TypeScript | 5.x | 类型安全 |
| 后端运行 | ts-node-dev | 2.x | 开发环境热重载 |
| 跨域 | cors | 2.x | 处理跨域请求 |
| ID生成 | uuid | 9.x | 生成唯一ID |
| 加密 | crypto-js | 4.x | AES加密信件内容 |
| 定时任务 | node-cron | 3.x | 每日定时检查胶囊 |
| 密码哈希 | bcryptjs | 2.x | 用户密码加密存储 |
| JWT | jsonwebtoken | 9.x | 生成/验证认证令牌 |

### 2.2 性能优化方案

1. **前端首屏优化（≤2秒）**
   - Vite代码分割，按路由懒加载非首屏组件
   - React.lazy + Suspense实现组件级懒加载
   - 关键CSS内联，非关键CSS异步加载
   - 图片资源优化，使用WebP格式

2. **时间轴60fps滚动**
   - 虚拟滚动技术（react-window），仅渲染可见区域
   - CSS transform硬件加速
   - 防抖处理滚动事件
   - requestAnimationFrame优化动画

3. **后端API响应（≤200ms）**
   - 内存数据结构索引优化
   - 异步处理非关键路径
   - 定时任务独立于请求线程

## 3. 路由定义

| 路由路径 | 页面组件 | 权限 | 说明 |
|----------|----------|------|------|
| `/` | CapsuleTimeline | 需要登录 | 主页，胶囊时间轴 |
| `/login` | LoginPage | 公开 | 登录页面 |
| `/register` | RegisterPage | 公开 | 注册页面 |
| `/deliver` | CapsuleEditor | 需要登录 | 投递页面，创建胶囊 |
| `/read/:id` | ReaderPage | 需要登录 | 阅读页面，查看胶囊内容 |
| `*` | 404 Page | 公开 | 未找到页面重定向到登录 |

## 4. API定义

### 4.1 TypeScript类型定义

```typescript
// 用户类型
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  receivedCapsules: string[]; // 已收到的胶囊ID列表（避免重复匹配）
}

// 胶囊类型
interface Capsule {
  id: string;
  title: string;
  encryptedContent: string; // AES加密的内容
  senderId: string;
  receiverId?: string; // 匹配后的接收者ID
  deliverTime: string; // 投递时间
  unlockTime: string; // 期望开启时间
  isUnlocked: boolean; // 是否已开启
  isOpened: boolean; // 是否已被阅读
  passwordHash?: string; // 4位数字密码哈希（可选）
  createdAt: string;
  isMatched: boolean; // 是否已匹配发送
}

// 认证响应
interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

// API响应包装
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 4.2 认证接口

#### POST /api/auth/register
- 描述：用户注册
- 请求体：
  ```typescript
  { email: string; password: string }
  ```
- 响应：`ApiResponse<AuthResponse>`
- 验证：邮箱格式、密码强度（≥8位，含数字字母）、邮箱唯一性
- 错误码：400（参数错误）、409（邮箱已存在）

#### POST /api/auth/login
- 描述：用户登录
- 请求体：
  ```typescript
  { email: string; password: string }
  ```
- 响应：`ApiResponse<AuthResponse>`
- JWT：有效期7天，payload包含userId
- 错误码：401（认证失败）

### 4.3 胶囊接口

#### POST /api/capsules
- 描述：创建新胶囊
- 认证：需要Bearer Token
- 请求体：
  ```typescript
  {
    title: string;        // 标题，≤30字
    content: string;      // 原始内容
    unlockTime: string;   // ISO日期，未来30天内
    password?: string;    // 可选，4位数字
  }
  ```
- 响应：`ApiResponse<Capsule>`
- 处理：AES加密内容，bcrypt加密密码（如果有）

#### GET /api/capsules
- 描述：获取当前用户的所有胶囊
- 认证：需要Bearer Token
- 响应：`ApiResponse<Capsule[]>`

#### GET /api/capsules/:id
- 描述：获取单个胶囊详情
- 认证：需要Bearer Token
- 响应：`ApiResponse<Capsule>`

#### POST /api/capsules/:id/unlock
- 描述：开启胶囊（验证密码+解密）
- 认证：需要Bearer Token
- 请求体：
  ```typescript
  { password?: string }
  ```
- 响应：`ApiResponse<{ content: string; title: string }>`
- 错误码：403（密码错误）、400（未到开启时间）

#### GET /api/capsules/received
- 描述：获取用户收到的陌生人胶囊
- 认证：需要Bearer Token
- 响应：`ApiResponse<Capsule[]>`

## 5. 服务器架构图

```mermaid
graph TD
    subgraph "Express 服务器 (端口 3001)"
        A["HTTP请求入口"] --> B["CORS中间件"]
        B --> C["JSON解析中间件"]
        C --> D{"需要认证?"}
        D -->|是| E["JWT验证中间件"]
        D -->|否| F["公开路由"]
        E --> G["受保护路由"]
        
        F --> F1["POST /api/auth/register"]
        F --> F2["POST /api/auth/login"]
        
        G --> G1["POST /api/capsules"]
        G --> G2["GET /api/capsules"]
        G --> G3["GET /api/capsules/:id"]
        G --> G4["POST /api/capsules/:id/unlock"]
        G --> G5["GET /api/capsules/received"]
    end

    subgraph "服务层"
        H["AuthService"] --> I["bcryptjs密码哈希"]
        H --> J["jsonwebtoken令牌生成"]
        K["CapsuleService"] --> L["crypto-js AES加解密"]
        K --> M["日期验证（未来30天）"]
        N["MatchService"] --> O["随机用户匹配算法"]
        N --> P["发送日志记录"]
    end

    subgraph "数据存储层 (内存)"
        Q["users Map<userId, User>"]
        R["capsules Map<capsuleId, Capsule>"]
        S["emailIndex Map<email, userId>"]
    end

    subgraph "定时任务 (独立线程)"
        T["node-cron 0 0 * * *"] --> U["每日匹配任务"]
        U --> V["查询已到期胶囊"]
        V --> W["MatchService随机匹配"]
        W --> X["更新胶囊状态"]
        X --> Y["控制台输出发送日志"]
    end

    F1 --> H
    F2 --> H
    G1 --> K
    G2 --> K
    G3 --> K
    G4 --> K
    G5 --> K
    
    H --> Q
    H --> S
    K --> R
    K --> Q
    U --> R
    U --> Q
```

## 6. 数据模型

### 6.1 实体关系图

```mermaid
erDiagram
    USER ||--o{ CAPSULE : "发送"
    USER ||--o{ CAPSULE : "接收"
    
    USER {
        string id PK "UUID"
        string email UK "邮箱"
        string passwordHash "bcrypt哈希密码"
        datetime createdAt "创建时间"
        string[] receivedCapsules "已收到的胶囊ID"
    }
    
    CAPSULE {
        string id PK "UUID"
        string title "标题（≤30字）"
        string encryptedContent "AES加密内容"
        string senderId FK "发送者ID"
        string receiverId FK "接收者ID（匹配后）"
        datetime deliverTime "投递时间"
        datetime unlockTime "期望开启时间"
        boolean isUnlocked "是否已可开启"
        boolean isOpened "是否已被阅读"
        string passwordHash "4位密码哈希（可选）"
        datetime createdAt "创建时间"
        boolean isMatched "是否已匹配发送"
    }
```

### 6.2 数据结构定义（内存存储）

```typescript
// 内存数据存储
export interface DataStore {
  users: Map<string, User>;
  capsules: Map<string, Capsule>;
  emailToUserId: Map<string, string>;
}

// 索引优化
export interface Indexes {
  capsulesBySender: Map<string, string[]>;    // senderId -> capsuleIds
  capsulesByReceiver: Map<string, string[]>;  // receiverId -> capsuleIds
  capsulesByUnlockTime: Map<string, string[]>; // date -> capsuleIds
  pendingCapsules: string[];                   // 待匹配的胶囊ID
}
```

### 6.3 加密配置

```typescript
// 加密密钥（环境变量）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'time-capsule-secret-key-2024';

// AES加密配置
const AES_CONFIG = {
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7,
  keySize: 256
};

// bcrypt配置
const BCRYPT_SALT_ROUNDS = 10;

// JWT配置
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'jwt-secret-key-2024',
  expiresIn: '7d'
};
```
