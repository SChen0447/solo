## 1. 架构设计

```mermaid
flowchart TB
    A["浏览器"] --> B["React 18 前端应用"]
    B --> C["组件层"]
    C --> C1["App.tsx 主组件"]
    C --> C2["Card.tsx 卡片组件"]
    C --> C3["CreatePanel.tsx 创建面板"]
    B --> D["状态管理层"]
    D --> D1["useState (卡片列表/选中/动画)"]
    D --> D2["localStorage (持久化存储)"]
    B --> E["样式层"]
    E --> E1["内联CSS样式"]
    E --> E2["CSS动画与过渡"]
    B --> F["工具层"]
    F --> F1["时间格式化"]
    F --> F2["剪贴板操作"]
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **开发语言**：TypeScript（严格模式，target ES2020，module ESNext）
- **数据存储**：浏览器 localStorage（无后端，纯前端应用）
- **字体资源**：Google Fonts（Caveat手写体 + Georgia衬线体）
- **图标方案**：内联SVG（羽毛笔、分享链接链图标）

## 3. 路由定义
| 路由 | 用途 |
|-----|------|
| / | 主页，包含展示区和创建面板 |

本应用为单页面应用，无多路由需求。

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    SMELL_CARD {
        string id PK "唯一标识"
        string title "气味名称（最多15字）"
        string memory "文字记忆（最多150字）"
        string imageUrl "图片URL（可选）"
        number createdAt "创建时间戳（毫秒）"
    }
```

### 4.2 TypeScript 类型定义

```typescript
interface SmellCard {
  id: string;
  title: string;
  memory: string;
  imageUrl?: string;
  createdAt: number;
}
```

### 4.3 localStorage 存储方案
- **存储Key**：`smell-archive-cards`
- **数据格式**：JSON序列化的SmellCard数组
- **容量限制**：最多20张卡片，超出时自动删除`createdAt`最小的记录
- **读写时机**：应用启动时读取，每次增删时同步写入
