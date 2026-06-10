## 1. 架构设计

```mermaid
graph TD
    A["用户浏览器"] --> B["React App (App.tsx)"]
    B --> C["EditorPanel.tsx"]
    B --> D["ResultPanel.tsx"]
    B --> E["协作状态管理 (useState)"]
    B --> F["localStorage 片段存储"]
    C --> G["Monaco Editor"]
    C --> H["远程光标装饰层"]
    D --> I["iframe 沙箱"]
    I --> J["postMessage 通信"]
    E --> K["BroadcastChannel 同步"]
```

**数据流向：**
1. `App.tsx` → `EditorPanel.tsx`：传入 `code`、`cursorPosition`、`language`、`theme`
2. `EditorPanel.tsx` → `App.tsx`：通过 `onCodeChange`、`onCursorChange` 回调更新状态
3. `App.tsx` → `ResultPanel.tsx`：传入 `code`、`language`、`theme`
4. `ResultPanel.tsx` → iframe：通过 `postMessage` 发送代码执行指令
5. iframe → `ResultPanel.tsx`：通过 `postMessage` 返回 console 输出和错误
6. 协作同步：`App.tsx` 通过 `BroadcastChannel` 在多标签页间同步状态

## 2. 技术描述

- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5 + @vitejs/plugin-react
- **代码编辑器**：monaco-editor
- **工具库**：uuid（生成片段 ID）、lodash（防抖/节流）
- **协作机制**：BroadcastChannel API（模拟多用户同步）
- **存储**：localStorage（代码片段持久化）
- **代码执行**：iframe 沙箱 + postMessage 通信

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主编辑器页面（单页应用，无其他路由） |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    CODE_SNIPPET {
        string id "UUID"
        string title "片段标题"
        string code "代码内容"
        string language "javascript/typescript"
        number createdAt "保存时间戳"
    }
    CURSOR_POSITION {
        number lineNumber "行号"
        number column "列号"
        string userId "用户标识"
        string userName "用户名"
    }
    COLLAB_STATE {
        string code "当前代码"
        CURSOR_POSITION cursor "光标位置"
        string language "当前语言"
    }
```

### 4.2 核心类型定义

```typescript
interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: 'javascript' | 'typescript';
  createdAt: number;
}

interface CursorPosition {
  lineNumber: number;
  column: number;
  userId: string;
  userName: string;
}

interface ConsoleOutput {
  type: 'log' | 'error' | 'warn' | 'info';
  content: string;
  timestamp: number;
}

type Theme = 'light' | 'dark';
type Language = 'javascript' | 'typescript';
```

## 5. 文件结构与调用关系

```
src/
├── App.tsx              # 主组件，状态管理中枢
│   ├── EditorPanel.tsx  # 编辑器面板（被 App 调用）
│   └── ResultPanel.tsx  # 结果预览面板（被 App 调用）
├── main.tsx             # React 入口
└── index.css            # 全局样式
```

**调用关系：**
- `main.tsx` → 渲染 `App.tsx`
- `App.tsx` → 渲染 `EditorPanel` 和 `ResultPanel`
- `EditorPanel.tsx` → 内部使用 `monaco-editor`，暴露 `onCodeChange`、`onCursorChange` 回调
- `ResultPanel.tsx` → 内部创建 iframe，通过 `postMessage` 双向通信
