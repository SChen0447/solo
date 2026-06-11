## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React + TypeScript + Vite)"
        A["App.tsx 主组件<br/>路由布局/全局状态"] --> B["Board.tsx 画布组件<br/>卡片排布/拖拽排序"]
        A --> C["CardEditor.tsx 编辑弹窗<br/>表单/颜色选择/标签"]
        B --> D["Card.tsx 卡片组件<br/>标题/标签/缩略图"]
        A --> E["Sidebar.tsx 侧边栏<br/>看板列表/新建看板"]
        A --> F["TopBar.tsx 顶部栏<br/>搜索/视图切换/新建"]
        A --> G["TagFilter.tsx 标签筛选<br/>标签高亮/筛选逻辑"]
        H["axios API 层"] --> I["RESTful API 调用"]
        J["zustand 状态管理"] --> A
    end

    subgraph "后端 (Express.js)"
        K["server/index.js<br/>Express 服务器"] --> L["GET /api/boards<br/>获取所有看板"]
        K --> M["POST /api/boards<br/>创建新看板"]
        K --> N["POST /api/cards<br/>添加卡片"]
        K --> O["PUT /api/cards/:id<br/>更新卡片"]
        K --> P["DELETE /api/cards/:id<br/>删除卡片"]
        Q["内存数据存储<br/>boards / cards"] --> K
    end

    I -. HTTP .-> K
```

## 2. 技术描述

### 2.1 前端技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **状态管理**：zustand
- **HTTP 客户端**：axios
- **拖拽排序**：SortableJS
- **样式方案**：CSS Modules / 内联样式
- **唯一 ID**：uuid

### 2.2 后端技术栈

- **框架**：Express 4
- **跨域**：cors
- **数据存储**：内存存储（开发/演示用）

### 2.3 开发工具

- **代码规范**：TypeScript 严格模式
- **目标环境**：ES2020

## 3. 文件结构

```
├── index.html                    # 入口页面
├── package.json                  # 项目依赖
├── vite.config.js                # Vite 配置
├── tsconfig.json                 # TypeScript 配置
├── server/
│   └── index.js                  # Express 后端服务器
└── src/
    ├── App.tsx                   # 主组件（路由布局/全局状态）
    ├── main.tsx                  # 应用入口
    ├── index.css                 # 全局样式
    ├── components/
    │   ├── Board.tsx             # 画布组件
    │   ├── Card.tsx              # 卡片组件
    │   ├── CardEditor.tsx        # 卡片编辑弹窗
    │   ├── Sidebar.tsx           # 侧边栏
    │   ├── TopBar.tsx            # 顶部导航栏
    │   └── TagFilter.tsx         # 标签筛选器
    ├── store/
    │   └── useBoardStore.ts      # zustand 状态管理
    ├── api/
    │   └── index.ts              # axios API 封装
    ├── types/
    │   └── index.ts              # TypeScript 类型定义
    └── utils/
        └── colors.ts             # 颜色预设工具
```

## 4. 数据流向

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 前端组件
    participant Store as Zustand Store
    participant API as Axios API
    participant Server as Express 后端

    User->>UI: 页面加载
    UI->>Store: 初始化状态
    Store->>API: GET /api/boards
    API->>Server: HTTP GET 请求
    Server-->>API: 返回看板列表
    API-->>Store: 更新看板数据
    Store-->>UI: 重新渲染

    User->>UI: 点击新建卡片
    UI->>UI: 打开编辑弹窗

    User->>UI: 填写表单并提交
    UI->>Store: 调用 addCard
    Store->>API: POST /api/cards
    API->>Server: HTTP POST 请求
    Server-->>API: 返回新卡片
    API-->>Store: 添加卡片到状态
    Store-->>UI: 重新渲染（弹入动画）

    User->>UI: 拖拽卡片排序
    UI->>Store: 调用 updateCardOrder
    Store->>API: PUT /api/cards/:id
    API->>Server: HTTP PUT 请求
    Server-->>API: 更新成功
    API-->>Store: 更新顺序
    Store-->>UI: 重新渲染

    User->>UI: 输入搜索关键词
    UI->>Store: 更新搜索关键词
    Store->>Store: 计算筛选结果
    Store-->>UI: 重新渲染（淡入淡出动画）
```

## 5. API 定义

### 5.1 类型定义

```typescript
interface Card {
  id: string;
  title: string;
  description?: string;
  color: string;
  tags: string[];
  imageUrl?: string;
  linkUrl?: string;
  order: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
}

interface Board {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 接口定义

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/boards` | 获取所有看板 | - | `Board[]` |
| POST | `/api/boards` | 创建新看板 | `{ name: string }` | `Board` |
| POST | `/api/cards` | 添加卡片到看板 | `Partial<Card> & { boardId: string }` | `Card` |
| PUT | `/api/cards/:id` | 更新卡片 | `Partial<Card>` | `Card` |
| DELETE | `/api/cards/:id` | 删除卡片 | - | `{ success: boolean }` |

## 6. 数据模型

### 6.1 ER 图

```mermaid
erDiagram
    BOARD ||--o{ CARD : contains
    
    BOARD {
        string id PK
        string name
        datetime createdAt
        datetime updatedAt
    }
    
    CARD {
        string id PK
        string title
        string description
        string color
        string tags
        string imageUrl
        string linkUrl
        int order
        string boardId FK
        datetime createdAt
        datetime updatedAt
    }
```

### 6.2 初始数据

默认创建一个名为"我的灵感"的看板，并包含 3 个示例卡片：
- 淡蓝色卡片：标签 "创意"
- 淡粉色卡片：标签 "参考"
- 淡黄色卡片：标签 "待办"

## 7. 性能优化策略

1. **虚拟列表**：卡片数量较多时考虑使用虚拟滚动
2. **防抖搜索**：搜索输入使用 200ms 防抖
3. **CSS 动画**：优先使用 transform 和 opacity 动画，触发 GPU 加速
4. **状态按需更新**：使用 zustand 的 selector 避免不必要的重渲染
5. **拖拽性能**：SortableJS 原生实现，保证 50ms 内响应
