## 1. 架构设计

```mermaid
graph TD
    "Browser" --> "React Router 路由层"
    "React Router 路由层" --> "App.tsx 布局组件"
    "App.tsx 布局组件" --> "Navbar 导航栏"
    "App.tsx 布局组件" --> "Page Components 页面层"
    "Page Components 页面层" --> "ReadingList 共读列表"
    "Page Components 页面层" --> "ReadingDetail 共读详情"
    "Page Components 页面层" --> "Profile 个人档案"
    "Page Components 页面层" --> "GlobalContext 全局状态"
    "GlobalContext 全局状态" --> "localStorage 持久化存储"
```

## 2. 技术选型

- 前端框架：React 18 + TypeScript
- 构建工具：Vite 5
- 路由：react-router-dom v6
- 状态管理：React Context API + useReducer
- 数据持久化：localStorage（纯前端模拟后端）
- 样式：CSS Modules / 全局CSS（深色主题）
- 初始化工具：Vite脚手架

## 3. 文件结构与调用关系

```
project/
├── package.json               # 项目依赖与脚本配置
├── vite.config.js             # Vite构建配置（端口5173, HMR, 自动打开浏览器）
├── tsconfig.json              # TypeScript配置（严格模式, ES2020, react-jsx）
├── index.html                 # HTML入口
└── src/
    ├── main.tsx               # React入口，挂载App与Context Provider
    ├── App.tsx                # 路由配置 + 全局布局，数据流向：Context → 子路由
    ├── Context.tsx            # 全局状态管理（共读/成员/批注/聊天），数据持久化到localStorage
    ├── types.ts               # TypeScript类型定义
    ├── styles/
    │   └── global.css         # 全局样式（深色主题、动画、响应式）
    ├── components/
    │   ├── Navbar.tsx         # 导航栏组件（固定顶部、毛玻璃、响应式汉堡菜单）
    │   ├── ReadingCard.tsx    # 共读卡片组件（悬停动效、进度条动画）
    │   ├── AnnotationItem.tsx # 批注笔记项（毛玻璃、悬停展开、滑入动画）
    │   ├── ChatMessage.tsx    # 聊天消息项
    │   └── StatCard.tsx       # 统计数据卡片（渐变背景、弹出动画、数字计数器）
    └── pages/
        ├── ReadingList.tsx    # 共读列表页（网格布局，从Context读取共读列表）
        ├── ReadingDetail.tsx  # 共读详情页（三栏布局，批注+聊天）
        └── Profile.tsx        # 个人档案页（数据统计卡片）
```

### 数据流向说明
1. **Context.tsx** → 管理所有全局状态，初始化时从localStorage读取mock数据
2. **App.tsx** → 包裹Context Provider，配置React Router路由，分发数据到子页面
3. **ReadingList.tsx** → 从Context读取共读列表 → 渲染ReadingCard组件
4. **ReadingDetail.tsx** → 从URL参数获取共读ID → 从Context读取详情/批注/聊天 → 渲染三栏布局
5. **Profile.tsx** → 从Context读取当前用户统计数据 → 渲染StatCard组件
6. 用户操作（发布批注、发送消息）→ 调用Context.dispatch → 更新状态 → 持久化到localStorage

## 4. 路由定义

| 路由 | 页面组件 | 说明 |
|------|---------|------|
| `/` | ReadingList | 共读列表页（首页） |
| `/reading/:id` | ReadingDetail | 共读详情页，动态参数id |
| `/profile` | Profile | 个人阅读档案页 |
| `*` | ReadingList | 404重定向到首页 |

## 5. 数据模型

### 5.1 类型定义

```typescript
// 用户
interface User {
  id: string;
  name: string;
  avatar: string;
}

// 共读计划
interface ReadingPlan {
  id: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover: string;
  bookPages: number;
  startDate: string;
  endDate: string;
  description: string;
  members: string[];          // 用户ID列表
  progress: number;           // 整体进度 0-100
}

// 批注笔记
interface Annotation {
  id: string;
  readingId: string;
  userId: string;
  userName: string;
  pageNumber: number;
  content: string;
  createdAt: number;
}

// 聊天消息
interface ChatMessage {
  id: string;
  readingId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

// 用户阅读进度
interface UserProgress {
  readingId: string;
  userId: string;
  pagesRead: number;
  annotationsCount: number;
}

// 全局状态
interface AppState {
  currentUser: User;
  readingPlans: ReadingPlan[];
  annotations: Annotation[];
  chatMessages: ChatMessage[];
  userProgress: UserProgress[];
}
```

### 5.2 Mock初始数据
- 预置4-6个共读计划（含经典书籍如《百年孤独》《1984》《小王子》等）
- 预置3-5个模拟用户
- 每个共读计划预置5-10条批注笔记
- 每个共读计划预置8-15条聊天消息
- 当前用户参与2-3个共读计划

## 6. 性能优化策略

1. **路由懒加载**：使用React.lazy + Suspense实现路由级代码分割，页面切换≤200ms
2. **列表虚拟化**：批注和聊天列表使用overflow滚动容器，只渲染可视区域附近DOM（虚拟列表概念模拟）
3. **CSS动画优化**：使用transform和opacity动画，避免触发重排，确保帧率≥55fps
4. **状态批量更新**：useReducer统一管理状态，避免不必要的重渲染
5. **memo优化**：对列表项组件使用React.memo，减少重复渲染
6. **响应式降级**：600px以下自动关闭所有CSS动画，提升低端设备性能

## 7. 动画实现方案

| 动画场景 | 实现方式 | 参数 |
|---------|---------|------|
| 卡片悬停上浮 | CSS transform: translateY(-6px) | 0.4s ease-out |
| 卡片渐变描边 | CSS hover伪类 + linear-gradient | #7b68ee → #9370db |
| 进度条展开 | CSS @keyframes + width动画 | 1.2s, 0% → 实际值 |
| 批注笔记滑入 | CSS @keyframes slideDown | 0.5s ease-out |
| 数据卡片弹出 | CSS @keyframes bounceUp | 间隔0.2s, 弹性效果 |
| 数字计数器 | requestAnimationFrame + 状态更新 | 1.5s ease-out |
| 按钮悬停缩放 | CSS transform: scale(1.05) | 0.2s transition |
| 汉堡菜单滑出 | CSS transform: translateX | 0.3s ease |
