## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + TypeScript + Vite)"
        "App.tsx" --> "Canvas.tsx"
        "App.tsx" --> "颜色选择器"
        "App.tsx" --> "用户面板"
        "App.tsx" --> "Web Audio API"
    end
    subgraph "后端 (Express + TypeScript)"
        "JWT中间件" --> "路由处理"
        "路由处理" --> "内存数据存储"
    end
    "前端" -->|"HTTP/REST"| "后端"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + Tailwind CSS
- 初始化工具：vite-init
- 后端：Express@4 + TypeScript (ESM格式)
- 数据库：无，使用内存Map暂存数据
- 状态管理：zustand

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 登录/注册页 |
| /canvas | 画布主页（需JWT鉴权） |

## 4. API定义

### 4.1 认证相关

**POST /api/auth/register**
```typescript
interface RegisterRequest {
  username: string;
  password: string;
}
interface RegisterResponse {
  success: boolean;
  message: string;
}
```

**POST /api/auth/login**
```typescript
interface LoginRequest {
  username: string;
  password: string;
}
interface LoginResponse {
  success: boolean;
  token: string;
  username: string;
}
```

### 4.2 画布相关

**GET /api/canvas/colors**
```typescript
interface ColorsResponse {
  dominantColors: { color: string; count: number }[];
  primaryColor: string;
  secondaryColor: string;
}
```

**POST /api/canvas/submit**
```typescript
interface SubmitRequest {
  color: string;
  points: { x: number; y: number }[];
  username: string;
}
interface SubmitResponse {
  success: boolean;
}
```

### 4.3 用户相关

**GET /api/users/active**
```typescript
interface ActiveUsersResponse {
  activeCount: number;
  recentDrawings: {
    username: string;
    color: string;
    timestamp: number;
  }[];
}
```

## 5. 服务器架构图

```mermaid
graph LR
    "Controller" --> "Service"
    "Service" --> "MemoryStore"
    "MemoryStore" --> "Map数据结构"
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "User" {
        "string username PK"
        "string password"
        "number lastActive"
    }
    "Stroke" {
        "string id PK"
        "string color"
        "string username"
        "number timestamp"
        "number opacity"
    }
    "DrawingRecord" {
        "string username"
        "string color"
        "number timestamp"
    }
```

### 6.2 内存数据结构

- users: Map<string, { password: string; lastActive: number }>
- strokes: Map<string, { color: string; username: string; timestamp: number; opacity: number }>
- drawingRecords: Array<{ username: string; color: string; timestamp: number }>

## 7. 核心技术实现

### 7.1 光轨绘制与衰减
- Canvas 2D上下文绘制，shadowBlur=15px实现发光效果
- 每帧通过requestAnimationFrame更新透明度：2秒内从1.0线性衰减到0.2
- 粒子系统：每笔画产生30个粒子，大小3-5px随机，速度0.3px/帧，生命周期1秒

### 7.2 音乐合成
- Web Audio API OscillatorNode生成音符
- RGB到音符映射：R→C4(261.63Hz), G→G4(392.00Hz), B→E4(329.63Hz)
- 琶音播放：每1秒一个音符，GainNode控制音量淡入淡出

### 7.3 颜色统计
- 后端每5秒汇总当前活跃光轨的颜色分布
- 统计各颜色出现频次，排序取前2作为主色调1和主色调2
- 返回给前端用于导航栏渐变边框和音乐生成
