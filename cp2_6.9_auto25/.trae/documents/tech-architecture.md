## 1. 架构设计

```mermaid
graph TD
    A["前端 React + TypeScript + Vite"] --> B["API 工具层 (fetch封装)"]
    B --> C["后端 Express 模拟API"]
    C --> D["内存数据存储"]
    A --> E["UI 组件层"]
    E --> E1["Timeline 时间线组件"]
    E --> E2["Report 报告组件"]
    E --> E3["Navigation 导航栏"]
    A --> F["路由层 React Router"]
    F --> F1["/ 时间线视图"]
    F --> F2["/report 报告视图"]
```

## 2. 技术说明

- **前端**：React 18 + TypeScript + Vite 5
- **路由**：react-router-dom 6
- **图表**：recharts 2
- **后端**：Express 4（Node.js 模拟 API）
- **唯一ID**：uuid
- **数据存储**：后端内存数组（含至少20条预置数据、5天以上记录）

## 3. 路由定义

| 路由路径 | 用途 |
|---------|------|
| / | 时间线视图，默认首页 |
| /report | 报告视图，展示可视化图表 |

## 4. API 定义

### 类型定义

```typescript
interface TimeEntry {
  id: string;
  tag: 'work' | 'study' | 'fitness' | 'reading' | 'entertainment' | 'housework';
  startTime: string; // ISO 格式
  endTime: string;   // ISO 格式
  duration: number;  // 分钟
  date: string;      // YYYY-MM-DD
}
```

### 接口列表

| 方法 | 路径 | 请求体 | 响应 |
|-----|------|-------|------|
| GET | /api/entries | - | TimeEntry[] 返回所有条目 |
| POST | /api/entries | { tag, startTime, endTime } | TimeEntry 返回新创建条目 |
| DELETE | /api/entries/:id | - | { success: boolean } |

## 5. 服务器架构

```mermaid
graph LR
    A["Express App"] --> B["GET /api/entries"]
    A --> C["POST /api/entries"]
    A --> D["DELETE /api/entries/:id"]
    B --> E["内存数组 entries[]"]
    C --> E
    D --> E
```

## 6. 数据模型

### 6.1 数据定义

```mermaid
erDiagram
    TIME_ENTRY {
        string id PK
        string tag
        string startTime
        string endTime
        number duration
        string date
    }
```

### 6.2 预置数据

后端启动时初始化至少20条数据，覆盖至少5个不同日期，包含所有6种标签类型，用于报告视图展示。

## 7. 项目文件结构

```
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── server.js              # 后端 Express API
└── src/
    ├── App.tsx            # 主应用+路由
    ├── components/
    │   ├── Timeline.tsx   # 时间线组件
    │   └── Report.tsx     # 报告组件
    └── utils/
        └── api.ts         # API 请求封装
```
