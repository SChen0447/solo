## 1. 架构设计

```mermaid
flowchart TD
    subgraph "UI层"
        A["index.html (入口页面"]
        B["potionShelf.ts (货架UI渲染+拖拽)
        C["cauldron.ts (坩埚Canvas渲染+反应)
    end
    subgraph "逻辑层"
        D["main.ts (状态管理+事件调度)
        E["recipeBook.ts (配方数据+匹配逻辑)
    end
    subgraph "数据流"
        F["potionSelected事件"] --> D
        D --> G["addPotion()"]
        G --> C
        D --> H["matchRecipe()"]
        H --> E
        E --> I["配方结果"]
        I --> C
    end
```

## 2. 技术栈说明

- 前端：TypeScript + 原生HTML/CSS + Vite
- 构建工具：Vite (入口 index.html，开发端口8080)
- 渲染方案：Canvas 2D API绘制坩埚与粒子动画
- 状态管理：main.ts中集中管理
- 事件机制：自定义事件 (potionSelected)

## 3. 文件结构与职责

| 文件 | 职责 | 输出/输入 |
|------|------|----------|
| package.json | 依赖声明(vite, typescript)，启动脚本 | 无 |
| vite.config.js | Vite构建配置，入口index.html，端口8080 | 无 |
| tsconfig.json | TS严格模式，esnext模块，dom类型 | 无 |
| index.html | DOM结构：顶部提示栏、中央坩埚Canvas、底部货架、得分、重置按钮 | 无 |
| src/main.ts | 全局状态(药水列表、得分、连击、目标配方)，事件监听，状态更新驱动UI渲染 | 输入：货架点击事件 输出：坩埚状态更新指令 |
| src/cauldron.ts | Canvas渲染坩埚、液体、气泡、漩涡、爆炸粒子；接收药水数组计算颜色、气泡密度、爆炸概率 | 输入：药水数据数组 输出：渲染+反应结果对象 |
| src/potionShelf.ts | 渲染6种药水瓶UI，处理悬停、点击、拖拽；向main.ts派发potionSelected自定义事件 | 输入：无 输出：DOM元素+事件 |
| src/recipeBook.ts | 内置10种配方数据；匹配药水组合(颜色种类、顺序无关) | 输入：药水组合数组 输出：配方名称、最终颜色、动画类型、特效参数 |

## 4. 数据模型

### 4.1 类型定义

```typescript
type PotionColor = '#FF4444' | '#4488FF' | '#44BB66' | '#AA44FF' | '#FFD700' | '#FF69B4'

interface Potion {
  id: string
  color: PotionColor
  name: string
}

interface Recipe {
  name: string
  colors: PotionColor[]
  finalColor: string
  animation: 'bubble' | 'vortex' | 'explosion'
  explosionProbability: number
  description: string
}

interface ReactionResult {
  finalColor: string
  bubbleDensity: number
  animationType: 'bubble' | 'vortex' | 'explosion' | 'none'
  matched: boolean
  recipeName?: string
}

interface GameState {
  potionsInCauldron: Potion[]
  score: number
  combo: number
  targetRecipe: Recipe
}
```

### 4.2 10种内置配方

| 配方名 | 颜色组合 | 最终颜色 | 动画类型 | 爆炸概率 |
|--------|----------|----------|----------|----------|
| 紫焰药水 | 红+蓝 | #8844FF | vortex | 0.1 |
| 翠光药水 | 绿+黄 | #AAEE22 | bubble | 0.3 |
| 烈焰魔药 | 红+黄 | #FF8822 | explosion | 0.5 |
| 海洋之心 | 蓝+绿 | #33CCCC | vortex | 0.05 |
| 粉霞梦境 | 红+粉 | #FF5588 | bubble | 0.15 |
| 星光秘药 | 蓝+紫 | #7744CC | vortex | 0.2 |
| 黄金圣药 | 黄+粉 | #FFB347 | bubble | 0.1 |
| 幻影三重奏 | 红+蓝+绿 | #668888 | explosion | 0.6 |
| 虹彩药水 | 红+黄+蓝 | #CC8844 | vortex | 0.4 |
| 死亡绽放 | 紫+粉+绿 | #88CC88 | explosion | 0.7 |

## 5. 核心算法

### 5.1 颜色加权混合公式

新颜色RGB = 原色RGB × 0.6 + 药水颜色RGB × 0.4

### 5.2 配方匹配算法

1. 将坩埚中药水颜色数组去重排序
2. 遍历10种配方，将配方颜色数组同样去重排序
3. 比较两个数组是否完全相等（长度相同且每个元素相等）

### 5.3 气泡运动

- 每帧生成5-15个气泡
- 半径：2-8px随机
- 上升速度：40-80px/s
- 透明度：0.8线性衰减至0
- 水平位置：正弦波波动 x = baseX + sin(time × frequency) × amplitude
- 生命周期：2秒

### 5.4 性能控制

- 最大同时活跃气泡+粒子 ≤ 300个
- 使用对象池复用气泡/粒子对象
- requestAnimationFrame驱动渲染循环
- 颜色计算和配方匹配优化：预计算配方哈希表 O(1) 查表
