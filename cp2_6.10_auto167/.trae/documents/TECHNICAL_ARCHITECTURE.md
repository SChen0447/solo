## 1. 架构设计

```mermaid
graph TD
    A["浏览器前端 (React 18)"] --> B["状态管理层 (useReducer)"]
    B --> C["组件层"]
    C --> D["App.tsx 主组件"]
    C --> E["BookCard.tsx 图书卡片"]
    C --> F["RankingPanel.tsx 排名面板"]
    C --> G["AddBookModal 添加图书模态框"]
    C --> H["PosterView 海报视图"]
    A --> I["localStorage 持久化 (storage.ts)"]
    A --> J["html2canvas 海报截图导出"]
```

## 2. 技术描述
- 前端：React 18 + TypeScript + Vite 5
- 初始化工具：vite-init (react-ts 模板)
- 后端：无，纯前端应用
- 数据库：浏览器 localStorage
- UI样式：CSS Modules / 内联样式（不使用Tailwind，按用户精确色值要求）
- 第三方库：uuid（唯一ID）、lodash（工具函数）、html2canvas（海报截图）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / (默认) | 主界面：书单管理 + 排名面板 |
| /poster | 海报展示视图 |

注：实际使用 React 内部状态切换视图模式，无需 react-router-dom

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    BOOKLIST ||--o{ BOOK : contains
    BOOK ||--o{ REVIEW : has
    
    BOOKLIST {
        string title
        string createdAt
    }
    
    BOOK {
        string id
        string title
        string author
        string coverColor
        number publishYear
        string recommendReason
        number[] ratings
        REVIEW[] reviews
    }
    
    REVIEW {
        string id
        string content
        number rating
        string timestamp
        string userName
    }
```

### 4.2 TypeScript 类型定义

```typescript
interface Review {
  id: string;
  content: string;
  rating: number;
  timestamp: string;
  userName: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  publishYear: number;
  recommendReason: string;
  ratings: number[];
  reviews: Review[];
}

interface BooklistState {
  title: string;
  books: Book[];
}
```

## 5. 加权排名算法
```
加权总分 = (平均评分 × 0.7) + (评价数量 × 0.5 × 0.3)
- 平均评分：所有评分的算术平均值（满分10分）
- 评价数量：每条评价加0.5分，乘以权重0.3
- 按加权总分降序排列
```

## 6. 文件结构
```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── components/
    │   ├── App.tsx
    │   ├── BookCard.tsx
    │   └── RankingPanel.tsx
    └── utils/
        └── storage.ts
```
