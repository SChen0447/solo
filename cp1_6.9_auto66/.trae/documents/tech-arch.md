## 1. 架构设计

```mermaid
graph TD
    subgraph Frontend["前端 (React + Vite, Port 3000)"]
        A["App.tsx - 主应用/状态管理"]
        B["RecordPlayer.tsx - 唱片机组件"]
        C["PixelEditor.tsx - 像素画板组件"]
        D["Timeline.tsx - 时光轴组件"]
        E["audioEngine.ts - 音频合成引擎"]
        F["Web Audio API - 8-bit声音合成"]
        G["Canvas API - 波形/像素绘制"]
    end

    subgraph Backend["后端 (Express, Port 4000)"]
        H["Express Server"]
        I["GET /api/capsules"]
        J["POST /api/capsules"]
        K["POST /api/capsules/:id/like"]
    end

    subgraph Data["数据存储"]
        L["server/data.json - 胶囊数据持久化"]
    end

    A --> B
    A --> C
    A --> D
    B --> E
    B --> F
    B --> G
    C --> G
    D --> G
    H --> I
    H --> J
    H --> K
    I --> L
    J --> L
    K --> L
    D --> I
    D --> J
    D --> K
```

## 2. 技术说明

- **前端框架**：React@18.2.0 + React DOM@18.2.0
- **构建工具**：Vite@5.4.0 + @vitejs/plugin-react@4.2.0
- **开发语言**：TypeScript@5.5.0 (严格模式, ES2020)
- **后端框架**：Express@4.18.2
- **跨域处理**：cors@2.8.5
- **ID生成**：uuid@9.0.0
- **音频处理**：Web Audio API (原生，无需额外库)
- **图形绘制**：Canvas API (原生，无需额外库)

## 3. 路由定义

前端为单页应用(SPA)，使用内部状态管理页面切换：

| 视图 | 说明 |
|------|------|
| home | 首页：唱片机 + 预设旋律 + 时光轴 |
| create | 制作页：像素画板 + 发布表单 |

## 4. API 定义

### 4.1 类型定义

```typescript
// 旋律参数 - 用于合成8-bit音乐
interface MelodyParams {
  type: 'sine' | 'square';
  notes: Array<{
    frequency: number;
    duration: number; // 秒
    startTime: number; // 相对起始时间
  }>;
  totalDuration: number; // 总时长 2-5秒
}

// 像素数据 - 16x16 RGBA像素数组
type PixelData = string[][]; // 16x16，存储颜色值或空字符串

// 情绪标签类型
type MoodTag = '兴奋' | '平静' | '忧郁' | '怀旧' | '迷幻';

// 胶囊完整数据
interface Capsule {
  id: string; // uuid
  melodyParams: MelodyParams;
  pixelData: PixelData;
  text: string; // 最多50字
  mood: MoodTag;
  timestamp: number; // 发布时间戳
  likes: number; // 点赞数
  likedBy: string[]; // 点赞用户标识(localStorage)
}
```

### 4.2 接口说明

#### GET /api/capsules
获取所有胶囊列表，按发布时间倒序排列

**响应**：
```json
{
  "success": true,
  "data": Capsule[]
}
```

#### POST /api/capsules
创建新的时光胶囊

**请求体**：
```json
{
  "melodyParams": MelodyParams,
  "pixelData": PixelData,
  "text": string,
  "mood": MoodTag
}
```

**响应**：
```json
{
  "success": true,
  "data": { "id": string }
}
```

#### POST /api/capsules/:id/like
对指定胶囊点赞

**请求体**：
```json
{
  "userId": string // 基于localStorage生成的用户标识
}
```

**响应**：
```json
{
  "success": true,
  "data": { "likes": number, "liked": boolean }
}
```

## 5. 服务端架构

```mermaid
graph LR
    A["Express Router"] --> B["Controller Layer"]
    B --> C["File Storage Layer"]
    C --> D["data.json (JSON文件读写)"]
    
    B --> E["CapsuleController: getCapsules()"]
    B --> F["CapsuleController: createCapsule()"]
    B --> G["CapsuleController: likeCapsule()"]
    
    C --> H["Storage: readData()"]
    C --> I["Storage: writeData()"]
```

## 6. 数据模型

### 6.1 数据结构定义

```mermaid
erDiagram
    CAPSULE {
        string id PK "UUID"
        object melodyParams "旋律参数"
        object pixelData "16x16像素数据"
        string text "文字描述(≤50字)"
        string mood "情绪标签"
        number timestamp "发布时间戳"
        number likes "点赞计数"
        array likedBy "点赞用户列表"
    }
```

### 6.2 server/data.json 示例

```json
{
  "capsules": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "melodyParams": {
        "type": "square",
        "notes": [
          { "frequency": 440, "duration": 0.25, "startTime": 0 },
          { "frequency": 523, "duration": 0.25, "startTime": 0.25 }
        ],
        "totalDuration": 2.0
      },
      "pixelData": [["#ff0066", "", ...], ...],
      "text": "夏日午后的阳光",
      "mood": "平静",
      "timestamp": 1717900000000,
      "likes": 3,
      "likedBy": ["user-xxx", "user-yyy", "user-zzz"]
    }
  ]
}
```

## 7. 项目文件结构

```
auto66/
├── package.json          # 根目录依赖和启动脚本
├── index.html            # Vite入口HTML
├── tsconfig.json         # TypeScript配置
├── vite.config.js        # Vite配置(端口3000, proxy到4000)
├── src/
│   ├── App.tsx           # 主应用组件
│   ├── components/
│   │   ├── RecordPlayer.tsx   # 唱片机组件
│   │   ├── PixelEditor.tsx    # 像素画板组件
│   │   └── Timeline.tsx       # 时光轴组件
│   └── utils/
│       └── audioEngine.ts     # 音频引擎工具
└── server/
    ├── package.json      # 后端依赖
    ├── index.js          # Express服务端
    └── data.json         # 数据存储文件
```
