## 1. 架构设计

```mermaid
graph TD
    A["React 前端 (Vite)"] --> B["App.tsx 主组件"]
    B --> C["BookCard.tsx 书籍卡片"]
    B --> D["StatusBar 状态栏"]
    B --> E["Modal 操作模态框"]
    A --> F["axios API 调用"]
    F -->|/api/*| G["Express 后端 (3001端口)"]
    G --> H["api.ts 路由处理"]
    H --> I["dataManager.ts 数据管理器"]
    I --> J["books.json 数据存储"]
```

## 2. 技术描述

- **前端**：React@18.2.0 + ReactDOM@18.2.0 + TypeScript + Vite
- **后端**：Express@4.18.2 + TypeScript
- **构建工具**：Vite + @vitejs/plugin-react
- **数据存储**：JSON 文件 (src/server/books.json)
- **HTTP 客户端**：axios
- **辅助库**：uuid、cors
- **开发模式**：concurrently 同时启动前后端

## 3. 路由定义

| 路由 | 用途 |
|-----|------|
| / | 前端主页面 (Vite 开发服务器) |
| /api/books/getBooks | 获取所有书籍列表 |
| /api/books/borrow | 借书操作 |
| /api/books/return | 还书操作 |
| /api/books/reserve | 预约/取消预约操作 |

## 4. API 定义

### 类型定义
```typescript
type BookStatus = 'available' | 'borrowed' | 'reserved';

interface Book {
  id: string;
  title: string;
  author: string;
  status: BookStatus;
  borrowerId?: string;
  borrowTime?: string;
  reserverId?: string;
  reserveTime?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}
```

### 请求/响应 Schema

**GET /api/books/getBooks**
- 响应：`{ success: true, data: Book[] }`

**POST /api/books/borrow**
- 请求体：`{ bookId: string, studentId: string }`
- 响应成功：`{ success: true, data: Book, message: "借书成功" }`
- 响应失败：`{ success: false, message: "书籍不在馆/学号无效" }`

**POST /api/books/return**
- 请求体：`{ bookId: string, studentId: string }`
- 响应成功：`{ success: true, data: Book, message: "归还成功" }`
- 响应失败：`{ success: false, message: "学号不匹配/书籍未借出" }`

**POST /api/books/reserve**
- 请求体：`{ bookId: string, studentId: string, cancel?: boolean }`
- 响应成功：`{ success: true, data: Book, message: "预约成功/取消预约成功" }`
- 响应失败：`{ success: false, message: "书籍状态不允许预约" }`

## 5. 服务端架构图

```mermaid
graph LR
    A["api.ts (Express Router)"] -->|getBooks| B["dataManager.getBooks()"]
    A -->|borrow| C["dataManager.borrowBook()"]
    A -->|return| D["dataManager.returnBook()"]
    A -->|reserve| E["dataManager.reserveBook()"]
    B --> F["读写 books.json"]
    C --> F
    D --> F
    E --> F
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    BOOK {
        string id PK "UUID"
        string title "书名"
        string author "作者"
        string status "状态: available/borrowed/reserved"
        string borrowerId FK "借书人学号(可选)"
        string borrowTime "借书时间(可选)"
        string reserverId FK "预约人学号(可选)"
        string reserveTime "预约时间(可选)"
    }
```

### 6.2 初始数据格式 (books.json)

```json
{
  "books": [
    {
      "id": "uuid-1",
      "title": "JavaScript高级程序设计",
      "author": "Nicholas C. Zakas",
      "status": "available"
    }
  ]
}
```

## 7. 文件结构

```
project-root/
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
├── src/
│   ├── client/
│   │   ├── App.tsx
│   │   └── components/
│   │       └── BookCard.tsx
│   └── server/
│       ├── api.ts
│       ├── dataManager.ts
│       └── books.json
```
