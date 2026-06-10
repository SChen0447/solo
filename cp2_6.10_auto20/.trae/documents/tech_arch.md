## 1. 架构设计

```mermaid
graph TD
    "A[main.ts 入口]" --> "B[全局状态管理器]"
    "A" --> "C[data.ts 数据模块]"
    "B" --> "D[controls.ts 筛选控件]"
    "B" --> "E[barChart.ts 柱状图]"
    "B" --> "F[lineChart.ts 折线图]"
    "C" --> "E"
    "C" --> "F"
    "D" --> "B"
    "E" --> "B"
```

## 2. 技术栈说明
- **前端框架**：TypeScript + Vite（无额外UI框架，原生D3操作DOM）
- **数据可视化**：D3.js@7.8.5 + @types/d3
- **构建工具**：Vite 开发服务器端口 3000
- **状态管理**：自定义发布订阅模式的轻量状态管理器
- **数据**：纯前端模拟数据，无后端依赖

## 3. 模块文件结构与调用关系

```
e:\solo\VersionFast\tasks\auto20\
├── package.json              # 项目依赖配置
├── vite.config.js            # Vite构建配置(端口3000,支持TS)
├── tsconfig.json             # TS配置(严格模式,ES2020,DOM类型)
├── index.html                # 入口HTML(SVG容器)
└── src/
    ├── main.ts               # 入口:初始化状态→加载数据→渲染所有模块
    ├── utils/
    │   └── data.ts           # 模拟数据生成+过滤纯函数(被main, charts调用)
    ├── controls/
    │   └── controls.ts       # 筛选控件:监听DOM事件→更新状态(被main调用)
    └── charts/
        ├── barChart.ts       # 柱状图:接收数据+状态→D3渲染→触发选中事件(被main调用)
        └── lineChart.ts      # 折线图:接收数据+状态→D3渲染+Tooltip(被main调用)
```

**数据流向**:
1. `data.ts` 生成原始数据 `CarbonEmission[]` 并导出过滤函数
2. `main.ts` 加载数据后注入全局状态 `AppState`
3. `controls.ts` 用户操作 → 更新 `AppState.filters` → 触发 `stateChange` 事件
4. `barChart.ts` 监听状态变化 → 调用过滤函数 → D3重绘 → 点击时更新 `AppState.selectedCountry`
5. `lineChart.ts` 监听状态变化 → 调用过滤函数 → D3重绘趋势线

## 4. 核心数据模型

```typescript
// 单条碳排放记录
interface CarbonEmission {
  country: string;    // 国家名称
  continent: string;  // 所属大洲
  year: number;       // 年份 2000-2020
  month: number;      // 月份 1-12
  value: number;      // 碳排放量(百万吨)
}

// 柱状图聚合数据(国家年度总量)
interface CountryYearTotal {
  country: string;
  continent: string;
  year: number;
  total: number;
}

// 全局状态
interface AppState {
  selectedYear: number;          // 当前选中年份
  selectedCountry: string | null;// 当前选中国家(null=未选中)
  selectedContinents: string[];  // 选中的大洲列表
  allData: CarbonEmission[];     // 完整数据集
}

// 筛选条件
interface Filters {
  year?: number;
  country?: string;
  continents?: string[];
}
```

## 5. 事件总线设计
```typescript
// 事件类型
type StateEvent = 'yearChange' | 'countryChange' | 'continentChange' | 'reset';

// 状态管理器API
interface StateManager {
  getState(): AppState;
  setYear(year: number): void;
  setCountry(country: string | null): void;
  toggleContinent(continent: string): void;
  reset(): void;
  subscribe(event: StateEvent, callback: () => void): () => void;
}
```

## 6. 纯函数API
```typescript
// src/utils/data.ts 导出
generateMockData(): CarbonEmission[]
filterByYear(data: CarbonEmission[], year: number): CarbonEmission[]
filterByContinents(data: CarbonEmission[], continents: string[]): CarbonEmission[]
aggregateByCountryYear(data: CarbonEmission[]): CountryYearTotal[]
getCountryTimeSeries(data: CarbonEmission[], country: string): {year: number; value: number}[]
```
