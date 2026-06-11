## 1. 架构设计

```mermaid
flowchart TD
    "index.html 入口页面" --> "main.ts 初始化"
    "main.ts 初始化" --> "Three.js 渲染器/场景/相机"
    "main.ts 初始化" --> "Molecule.ts 分子管理"
    "main.ts 初始化" --> "Interaction.ts 交互管理"
    "main.ts 初始化" --> "UI.ts 界面管理"
    "Molecule.ts 分子管理" --> "原子Mesh创建/更新/删除"
    "Molecule.ts 分子管理" --> "键Mesh创建/更新/删除"
    "Molecule.ts 分子管理" --> "粒子特效系统"
    "Molecule.ts 分子管理" --> "过渡动画系统"
    "Interaction.ts 交互管理" --> "Raycaster检测"
    "Interaction.ts 交互管理" --> "原子高亮"
    "Interaction.ts 交互管理" --> "键合模拟逻辑"
    "UI.ts 界面管理" --> "左侧分子选择按钮"
    "UI.ts 界面管理" --> "右侧信息面板"
    "UI.ts 界面管理" --> "响应式布局"
    "Interaction.ts" -->|"键合/断裂指令"| "Molecule.ts"
    "Molecule.ts" -->|"分子数据"| "UI.ts"
```

## 2. 技术说明

- **前端**：TypeScript + Three.js@0.160.0 + Vite@5.0.0
- **初始化工具**：手动创建项目（非React/Vue模板，纯TS+Three.js）
- **后端**：无
- **数据库**：无
- **构建工具**：Vite@5.0.0
- **TypeScript**：5.3.3，严格模式，目标ES2020

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含3D分子渲染、交互、信息面板 |

## 4. 文件结构

```
project/
├── package.json           # 依赖：three@0.160.0, typescript@5.3.3, vite@5.0.0, @types/three@0.160.0
├── vite.config.js         # 构建配置，TypeScript，base: './'
├── tsconfig.json          # 严格模式，目标ES2020
├── index.html             # 入口页面，全屏深蓝黑背景
└── src/
    ├── main.ts            # 入口文件：初始化渲染器/场景/相机/渲染循环
    ├── Molecule.ts        # 分子类：原子/键管理、位置计算、粒子特效、过渡动画
    ├── Interaction.ts     # 交互管理器：Raycaster、高亮、键合模拟
    └── UI.ts              # UI模块：左侧按钮、右侧面板、响应式布局
```

## 5. 模块职责

### 5.1 main.ts
- 初始化WebGL渲染器（antialias、alpha）
- 创建Scene、PerspectiveCamera
- 添加AmbientLight + DirectionalLight
- 实例化Molecule、Interaction、UI模块
- 启动requestAnimationFrame渲染循环
- 处理窗口resize事件
- 协调模块间通信

### 5.2 Molecule.ts
- 预设分子数据（H2O、CH4、CO2、NH3的原子坐标和键信息）
- 创建原子Mesh（SphereGeometry + MeshPhongMaterial，不同颜色/半径）
- 创建键Mesh（CylinderGeometry + MeshPhongMaterial，半透明浅灰）
- 分子切换动画（原子从当前位置飞向新位置，1.5s ease-in-out）
- 键形成粒子特效（青色向外扩散）
- 键断裂粒子特效（红色消散）
- 环境粒子系统（浅青蓝半透明小点，100单位半径球体）
- 提供原子/键的增删改接口

### 5.3 Interaction.ts
- Raycaster鼠标拾取
- 原子悬停高亮（亮黄色光圈）
- 键悬停变色（淡蓝#66b3ff）+ 显示标签
- 键合模拟模式：点击第一个原子高亮，点击第二个原子触发键合/断裂
- 鼠标拖拽旋转（惯性0.5）
- 滚轮缩放（0.2-5倍，光照调整）

### 5.4 UI.ts
- 左侧栏：分子选择按钮（H2O/CH4/CO2/NH3），键合模拟模式切换
- 右侧栏：分子式、原子数量、键数、价态信息表格
- 按钮渐变背景、hover上移2px/0.2s、涟漪效果0.3s
- 表格交替背景、hover放大1.02倍
- 响应式：≥1200px三栏、800-1200px隐藏左栏+顶部下拉、<800px右侧折叠面板
