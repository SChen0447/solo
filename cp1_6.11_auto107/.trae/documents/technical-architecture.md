## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        "App.tsx 主组件"
        "CrystalBall.tsx 水晶球"
        "TarotReading.tsx 塔罗牌"
        "fateWeaver.ts 工具模块"
    end
    subgraph "样式层"
        "global.css 全局样式"
    end
    "App.tsx 主组件" --> "CrystalBall.tsx 水晶球"
    "App.tsx 主组件" --> "TarotReading.tsx 塔罗牌"
    "TarotReading.tsx 塔罗牌" --> "fateWeaver.ts 工具模块"
    "App.tsx 主组件" --> "fateWeaver.ts 工具模块"
    "global.css 全局样式" --> "App.tsx 主组件"
```

纯前端架构，无后端服务。所有占卜逻辑和命运星图生成在客户端完成。

## 2. 技术描述
- 前端：React 18 + TypeScript + Vite
- 初始化工具：vite-init (react-ts模板)
- 状态管理：React useState/useReducer（组件内状态）
- 样式方案：CSS变量 + CSS动画 + CSS Modules
- 后端：无
- 数据库：无（客户端本地生成）

### 依赖清单
| 依赖包 | 版本 | 用途 |
|--------|------|------|
| react | ^18 | UI框架 |
| react-dom | ^18 | DOM渲染 |
| typescript | ^5 | 类型安全 |
| vite | ^5 | 构建工具 |
| @vitejs/plugin-react | ^4 | Vite React插件 |
| uuid | ^9 | 生成唯一哈希码 |

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主界面（水晶球+占卜选择+塔罗牌+星图，单页应用通过状态切换） |

采用单页面状态驱动，不使用路由库。通过App.tsx中的状态机管理不同阶段的UI展示。

## 4. 数据模型

### 4.1 核心数据结构

```typescript
type DivinationMode = 'tarot' | 'crystal' | 'constellation'

type StarPattern = 'spiral' | 'wave' | 'radiate' | 'chess' | 'random'

interface TarotCard {
  id: number
  name: string
  symbol: string
  meaning: string
  color: string
  svgPath: string
}

interface DivinationResult {
  mode: DivinationMode
  cards: TarotCard[]
  prophecy: string[]
  starPattern: StarPattern
  hash: string
}

interface UserProfile {
  nickname: string
  zodiacSign: ZodiacSign
  result: DivinationResult | null
}

type ZodiacSign = '♈' | '♉' | '♊' | '♋' | '♌' | '♍' | '♎' | '♏' | '♐' | '♑' | '♒' | '♓'
```

### 4.2 状态流

```mermaid
stateDiagram-v2
    "idle" : 等待点击水晶球
    "selecting" : 选择占卜方式
    "divining" : 占卜进行中
    "registering" : 注册占卜师身份
    "result" : 展示命运星图
    "idle" --> "selecting" : 点击水晶球
    "selecting" --> "divining" : 选择占卜方式
    "divining" --> "registering" : 完成占卜+编织命运
    "registering" --> "result" : 提交身份信息
    "result" --> "idle" : 重新开始
```

## 5. 文件结构

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
└── src/
    ├── App.tsx              # 主组件，管理状态流程
    ├── main.tsx             # 入口文件
    ├── components/
    │   ├── CrystalBall.tsx  # 水晶球+星空+选择卡片
    │   └── TarotReading.tsx # 塔罗牌阵+翻牌+解读
    ├── utils/
    │   └── fateWeaver.ts   # 命运星图+预言+哈希
    └── styles/
        └── global.css       # CSS变量+深色主题
```

## 6. 动画实现策略

| 动画效果 | 实现方式 | 性能优化 |
|----------|----------|----------|
| 星星闪烁 | CSS animation + 随机animation-delay | will-change: opacity |
| 水晶球浮动 | CSS translateY + animation | transform + will-change |
| 雾气旋转 | CSS rotate animation (0.5度/秒) | transform: rotate |
| 涟漪扩散 | CSS @keyframes scale + opacity | transform: scale |
| 卡片悬停 | CSS transform: scale(1.1) + box-shadow | transition |
| 牌面倾斜 | CSS perspective + rotateY(15deg) | transform |
| 翻牌动画 | CSS 3D transform (rotateY 180deg, 0.6s) | transform + backface-visibility |
| 光点飞散 | CSS @keyframes translate + opacity | transform + will-change |
| 星图渲染 | CSS/Canvas 点位渲染 | requestAnimationFrame |
