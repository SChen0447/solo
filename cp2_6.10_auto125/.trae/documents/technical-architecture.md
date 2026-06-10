## 1. 架构设计

```mermaid
flowchart LR
    A["浏览器"] --> B["React Router"]
    B --> C["App.tsx (根组件)"]
    C --> D["BookList (主页)"]
    C --> E["BookDetail (详情页)"]
    D --> F["BookCard (卡片)"]
    D --> G["AddBookModal (模态框)"]
    D --> H["StatsPanel (统计)"]
    C --> I["data.ts (数据层)"]
    I --> J["Map<Book> & Map<BorrowRecord>"]
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **路由**：React Router DOM 6
- **状态管理**：自定义 Hook (useBookStore)，使用 Map 数据结构
- **工具库**：uuid (生成ID)、lodash (工具函数)
- **开发端口**：3000

## 3. 路由定义

| 路由 | 用途 |
|-------|---------|
| / | 图书列表主页 |
| /book/:id | 图书详情页 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    BOOK {
        string id PK "图书ID"
        string title "书名"
        string author "作者"
        string isbn "ISBN (XXX-XX-XXXXX)"
        string coverColor "封面颜色"
        number stock "库存数量"
        string status "状态: available/borrowed/reserved"
    }
    BORROW_RECORD {
        string id PK "记录ID"
        string bookId FK "图书ID"
        string readerName "读者姓名"
        string borrowDate "借书日期"
        string expectedReturnDate "预计还书日期"
        string actualReturnDate "实际还书日期"
    }
    BOOK ||--o{ BORROW_RECORD : "has"
```

### 4.2 TypeScript 类型定义

```typescript
type BookStatus = 'available' | 'borrowed' | 'reserved';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverColor: string;
  stock: number;
  status: BookStatus;
}

interface BorrowRecord {
  id: string;
  bookId: string;
  readerName: string;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
}
```

## 5. 文件结构

```
/
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── App.tsx          # 根组件，路由布局
    ├── data.ts          # 数据层 CRUD
    ├── BookCard.tsx     # 图书卡片
    ├── BookDetail.tsx   # 图书详情页
    └── AddBookModal.tsx # 添加图书模态框
```
