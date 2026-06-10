import { Whiteboard } from './board';
import { Toolbar } from './toolbar';
import { store } from './store';

interface SimulatedUser {
  id: string;
  name: string;
  color: string;
}

const SIMULATED_USERS: SimulatedUser[] = [
  { id: 'u1', name: '小明', color: '#FF6B6B' },
  { id: 'u2', name: '小红', color: '#4ECDC4' },
  { id: 'u3', name: '小李', color: '#FFD93D' }
];

class MockWebSocket {
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private connected = false;
  private onlineUsers = new Set<string>(['me']);
  private toolbar: Toolbar | null = null;

  connect(): void {
    setTimeout(() => {
      this.connected = true;
      this.emit('connected', null);
      setTimeout(() => {
        this.simulateOtherUsers();
      }, 1500);
    }, 300);
  }

  setToolbar(toolbar: Toolbar): void {
    this.toolbar = toolbar;
    this.updateOnlineCount();
  }

  private updateOnlineCount(): void {
    if (this.toolbar) {
      this.toolbar.setOnlineCount(this.onlineUsers.size);
    }
  }

  private simulateOtherUsers(): void {
    const joinInterval = setInterval(() => {
      if (this.onlineUsers.size >= SIMULATED_USERS.length + 1) {
        clearInterval(joinInterval);
        return;
      }
      const available = SIMULATED_USERS.filter(u => !this.onlineUsers.has(u.id));
      if (available.length > 0) {
        const user = available[Math.floor(Math.random() * available.length)];
        this.onlineUsers.add(user.id);
        this.emit('user-join', user);
        this.updateOnlineCount();
        this.showToast(`${user.name} 加入了协作`, user.color);
      }
    }, 3000);
  }

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  send(action: string, payload: unknown): void {
    if (!this.connected) return;
    setTimeout(() => {
      this.emit('broadcast', { action, payload, from: 'me' });
    }, 50);
  }

  private showToast(message: string, color: string): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.padding = '10px 18px';
    toast.style.backgroundColor = '#fff';
    toast.style.borderLeft = `4px solid ${color}`;
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
    toast.style.fontSize = '13px';
    toast.style.color = '#333';
    toast.style.zIndex = '10000';
    toast.style.animation = 'fadeInOut 3s ease-in-out';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

function applyGlobalStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
        'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: #F5F5F5;
      color: #333;
      -webkit-font-smoothing: antialiased;
    }
    #app {
      display: flex;
      flex-direction: column;
      width: 100vw;
      height: 100vh;
      animation: boardFadeIn 500ms ease-out;
    }
    #toolbar {
      flex-shrink: 0;
    }
    #board-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    @keyframes boardFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ripple {
      to {
        transform: scale(2.5);
        opacity: 0;
      }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(10px); }
      15% { opacity: 1; transform: translateY(0); }
      85% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-10px); }
    }
    .board-switch-enter {
      animation: boardFadeIn 500ms ease-out;
    }
    @media (max-width: 768px) {
      #toolbar {
        padding: 6px 8px !important;
        gap: 2px !important;
      }
      .toolbar-btn {
        width: 30px !important;
        height: 30px !important;
        font-size: 12px !important;
      }
      .online-status {
        display: none !important;
      }
    }
    @media (max-width: 1024px) {
      .zoom-display {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function initDemoData(): void {
  const state = store.getState();
  if (state.notes.length > 0 || state.shapes.length > 0) return;

  store.addNote(-350, -180, '# 产品头脑风暴\n\n欢迎使用协作白板！✨');
  store.addNote(-130, -180, '## 核心功能\n\n- **便签** 彩色分类\n- *画笔* 自由涂鸦\n- `分组` 整理思路');
  store.addNote(90, -180, '好棒的idea！\n\n这个创意非常赞 👍');

  store.addNote(-350, 0, '使用说明：\n\n1. 点击便签工具创建\n2. 双击编辑内容\n3. 拖拽移动位置');
  store.addNote(-130, 0, '快捷键：\n\nCtrl+Enter 保存编辑\n滚轮缩放画布\n空白处拖拽平移');
  store.addNote(90, 0, 'Great!\n\nLove this concept 🎯');
}

function bootstrap(): void {
  applyGlobalStyles();

  const app = document.getElementById('app');
  if (!app) {
    console.error('#app 容器未找到');
    return;
  }

  const toolbarEl = document.getElementById('toolbar');
  const boardEl = document.getElementById('board-container');
  if (!toolbarEl || !boardEl) {
    console.error('工具栏或白板容器未找到');
    return;
  }

  const toolbar = new Toolbar(toolbarEl);
  new Whiteboard(boardEl);
  initDemoData();

  const ws = new MockWebSocket();
  ws.setToolbar(toolbar);
  ws.connect();

  ws.on('connected', () => {
    console.log('[WebSocket] 已连接到协作服务器');
  });

  ws.on('user-join', (data) => {
    const user = data as SimulatedUser;
    console.log(`[WebSocket] 用户加入: ${user.name}`);
  });

  store.subscribe(() => {
    ws.send('state-update', { ts: Date.now() });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable) {
        return;
      }
      const state = store.getState();
      for (const id of state.selectedIds) {
        store.deleteNote(id);
      }
    }
    if (e.key === 'v' || e.key === 'V') {
      if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
        store.setActiveTool('select');
      }
    }
    if (e.key === 'n' || e.key === 'N') {
      if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
        store.setActiveTool('sticky');
      }
    }
    if (e.key === 'p' || e.key === 'P') {
      if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
        store.setActiveTool('pen');
      }
    }
    if (e.key === 'm' || e.key === 'M') {
      if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
        store.setActiveTool('marquee');
      }
    }
    if (e.key === 'g' || e.key === 'G') {
      if ((e.target as HTMLElement).tagName !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.groupSelectedNotes();
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
