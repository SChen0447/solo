import { v4 as uuidv4 } from 'uuid';
import { WhiteboardCanvas, type Tool, type DrawOp } from './canvas';
import { NetworkClient, type UserInfo, type ChatMsg, type ConnectionStatus } from './network';
import { ChatPanel } from './chat';

const COLOR_PALETTE = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf',
  '#ff8b94', '#c7ceea', '#95e1d3', '#f38181',
  '#aa96da', '#fcbad3', '#a8d8ea', '#ffd3b6'
];

const TOOLS: { id: Tool; icon: string; name: string }[] = [
  { id: 'pen', icon: 'edit', name: '画笔' },
  { id: 'line', icon: 'show_chart', name: '直线' },
  { id: 'rectangle', icon: 'check_box_outline_blank', name: '矩形' },
  { id: 'circle', icon: 'radio_button_unchecked', name: '圆形' },
  { id: 'note', icon: 'sticky_note_2', name: '便签' }
];

const app = document.getElementById('app');
if (!app) throw new Error('App container not found');

app.style.position = 'relative';
app.style.width = '100%';
app.style.height = '100%';
app.style.overflow = 'hidden';
app.style.backgroundColor = '#f5f0e8';

const canvasContainer = document.createElement('div');
canvasContainer.style.position = 'absolute';
canvasContainer.style.inset = '0';
app.appendChild(canvasContainer);

let roomId = '';
const pathMatch = window.location.pathname.match(/^\/room\/([a-zA-Z0-9-]+)/);
if (pathMatch) {
  roomId = pathMatch[1];
}

const storedUserId = localStorage.getItem('wb_userId');
const userId = storedUserId || uuidv4();
if (!storedUserId) localStorage.setItem('wb_userId', userId);

const storedUserName = localStorage.getItem('wb_userName');
const userName = storedUserName || `用户${Math.floor(Math.random() * 10000)}`;
if (!storedUserName) localStorage.setItem('wb_userName', userName);

let userColor = COLOR_PALETTE[0];
let currentTool: Tool = 'pen';
let strokeWidth = 4;
let canvas: WhiteboardCanvas | null = null;
let network: NetworkClient | null = null;
let chatPanel: ChatPanel | null = null;

const toolbarEl = buildToolbar();
const statusBarEl = buildStatusBar();
const disconnectedOverlayEl = buildDisconnectedOverlay();
app.appendChild(toolbarEl);
app.appendChild(statusBarEl);
app.appendChild(disconnectedOverlayEl);

chatPanel = new ChatPanel(app, {
  onSendMessage: (text) => {
    if (network) network.sendChat(text);
  }
});

canvas = new WhiteboardCanvas(canvasContainer, userId, {
  onDraw: (op) => {
    if (network) network.sendDraw(op);
  }
});

function buildToolbar(): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    position: absolute;
    top: 50%;
    left: 16px;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #fff;
    padding: 8px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    z-index: 50;
    font-family: 'Inter', sans-serif;
  `;

  TOOLS.forEach((tool) => {
    const btn = document.createElement('button');
    btn.dataset.tool = tool.id;
    btn.title = tool.name;
    btn.style.cssText = `
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      position: relative;
    `;
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 24px; color: #555;">${tool.icon}</span>`;

    btn.addEventListener('click', () => {
      currentTool = tool.id;
      if (canvas) canvas.setTool(currentTool);
      if (network) network.sendToolChange(currentTool, strokeWidth);
      updateToolbarSelection();
      updateStatusBar();
      btn.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
        { duration: 200, easing: 'ease-out' }
      );
    });

    btn.addEventListener('mouseenter', () => {
      if (btn.dataset.selected !== 'true') {
        btn.style.background = '#f5f5f5';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (btn.dataset.selected !== 'true') {
        btn.style.background = 'transparent';
      }
    });

    toolbar.appendChild(btn);
  });

  const separator1 = document.createElement('div');
  separator1.style.cssText = 'height: 1px; background: #e0e0e0; margin: 4px 0;';
  toolbar.appendChild(separator1);

  const widthWrap = document.createElement('div');
  widthWrap.style.cssText = 'padding: 4px; display: flex; flex-direction: column; align-items: center; gap: 4px;';

  const widthLabel = document.createElement('div');
  widthLabel.style.cssText = 'font-size: 11px; color: #666;';
  widthLabel.textContent = `${strokeWidth}px`;
  widthWrap.appendChild(widthLabel);

  const widthSlider = document.createElement('input');
  widthSlider.type = 'range';
  widthSlider.min = '1';
  widthSlider.max = '20';
  widthSlider.value = String(strokeWidth);
  widthSlider.style.cssText = 'width: 40px; writing-mode: bt-lr; -webkit-appearance: slider-vertical; height: 80px; cursor: pointer;';
  widthSlider.addEventListener('input', () => {
    strokeWidth = parseInt(widthSlider.value, 10);
    if (canvas) canvas.setStrokeWidth(strokeWidth);
    if (network) network.sendToolChange(currentTool, strokeWidth);
    widthLabel.textContent = `${strokeWidth}px`;
    updateStatusBar();
  });
  widthWrap.appendChild(widthSlider);
  toolbar.appendChild(widthWrap);

  const separator2 = document.createElement('div');
  separator2.style.cssText = 'height: 1px; background: #e0e0e0; margin: 4px 0;';
  toolbar.appendChild(separator2);

  const shareBtn = document.createElement('button');
  shareBtn.style.cssText = `
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `;
  shareBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 24px; color: #555;">share</span>`;
  shareBtn.title = '分享房间链接';
  shareBtn.addEventListener('click', async () => {
    const url = window.location.origin + `/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      shareBtn.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
        { duration: 250, easing: 'ease-out' }
      );
    } catch {
      prompt('复制此链接加入房间：', url);
    }
  });
  shareBtn.addEventListener('mouseenter', () => { shareBtn.style.background = '#f5f5f5'; });
  shareBtn.addEventListener('mouseleave', () => { shareBtn.style.background = 'transparent'; });
  toolbar.appendChild(shareBtn);

  updateToolbarSelection();
  return toolbar;
}

function updateToolbarSelection(): void {
  const buttons = toolbarEl.querySelectorAll<HTMLElement>('button[data-tool]');
  buttons.forEach((btn) => {
    if (btn.dataset.tool === currentTool) {
      btn.dataset.selected = 'true';
      btn.style.background = '#e3f2fd';
      btn.style.borderLeft = '3px solid #1976d2';
    } else {
      btn.dataset.selected = 'false';
      btn.style.background = 'transparent';
      btn.style.borderLeft = '3px solid transparent';
    }
  });
}

function buildStatusBar(): HTMLElement {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 36px;
    background: rgba(255,255,255,0.95);
    border-top: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 24px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: #555;
    z-index: 50;
    backdrop-filter: blur(8px);
  `;

  const toolInfo = document.createElement('div');
  toolInfo.style.display = 'flex';
  toolInfo.style.alignItems = 'center';
  toolInfo.style.gap = '8px';
  toolInfo.innerHTML = `
    <span class="material-symbols-outlined" style="font-size: 18px; color: #1976d2;">${TOOLS[0].icon}</span>
    <span>${TOOLS[0].name}</span>
    <span style="width: 12px; height: 12px; border-radius: 50%; background: ${userColor}; border: 1px solid #ccc;"></span>
    <span>${strokeWidth}px</span>
  `;
  toolInfo.dataset.id = 'toolInfo';

  const zoomInfo = document.createElement('div');
  zoomInfo.style.display = 'flex';
  zoomInfo.style.alignItems = 'center';
  zoomInfo.style.gap = '8px';
  zoomInfo.innerHTML = `
    <span class="material-symbols-outlined" style="font-size: 18px; color: #888;">zoom_out_map</span>
    <span data-id="zoomValue">100%</span>
  `;

  const connInfo = document.createElement('div');
  connInfo.style.display = 'flex';
  connInfo.style.alignItems = 'center';
  connInfo.style.gap = '8px';
  connInfo.style.marginLeft = 'auto';
  connInfo.innerHTML = `
    <span data-id="connDot" style="width: 10px; height: 10px; border-radius: 50%; background: #ffa726;"></span>
    <span data-id="connText">连接中...</span>
    <span style="color: #aaa; margin: 0 4px;">|</span>
    <span>房间: ${roomId || '...'}</span>
  `;

  bar.appendChild(toolInfo);
  bar.appendChild(zoomInfo);
  bar.appendChild(connInfo);

  return bar;
}

function updateStatusBar(): void {
  const toolData = TOOLS.find(t => t.id === currentTool) || TOOLS[0];
  const toolInfo = statusBarEl.querySelector<HTMLElement>('[data-id="toolInfo"]');
  if (toolInfo) {
    toolInfo.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 18px; color: #1976d2;">${toolData.icon}</span>
      <span>${toolData.name}</span>
      <span style="width: 12px; height: 12px; border-radius: 50%; background: ${userColor}; border: 1px solid #ccc;"></span>
      <span>${strokeWidth}px</span>
    `;
  }
  if (canvas) {
    const zoomVal = statusBarEl.querySelector<HTMLElement>('[data-id="zoomValue"]');
    if (zoomVal) zoomVal.textContent = `${Math.round(canvas.getScale() * 100)}%`;
  }
}

function updateConnectionStatus(status: ConnectionStatus): void {
  const dot = statusBarEl.querySelector<HTMLElement>('[data-id="connDot"]');
  const text = statusBarEl.querySelector<HTMLElement>('[data-id="connText"]');
  if (!dot || !text) return;

  const colors: Record<ConnectionStatus, string> = {
    connected: '#66bb6a',
    connecting: '#ffa726',
    disconnected: '#ef5350'
  };
  const labels: Record<ConnectionStatus, string> = {
    connected: '已连接',
    connecting: '连接中...',
    disconnected: '已断开'
  };
  dot.style.background = colors[status];
  text.textContent = labels[status];

  if (status === 'disconnected') {
    disconnectedOverlayEl.style.display = 'flex';
  } else {
    disconnectedOverlayEl.style.display = 'none';
  }
}

function buildDisconnectedOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(245, 240, 232, 0.85);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 200;
    font-family: 'Inter', sans-serif;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: #fff;
    padding: 32px 48px;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  `;

  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.style.cssText = 'font-size: 48px; color: #ef5350;';
  icon.textContent = 'wifi_off';

  const title = document.createElement('div');
  title.style.cssText = 'font-size: 18px; font-weight: 600; color: #333;';
  title.textContent = '连接已断开';

  const desc = document.createElement('div');
  desc.style.cssText = 'font-size: 14px; color: #666;';
  desc.textContent = '正在尝试重新连接...';

  const btn = document.createElement('button');
  btn.style.cssText = `
    padding: 10px 24px;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  btn.textContent = '立即重连';
  btn.addEventListener('click', () => {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);
    if (network) network.connect();
  });
  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#1565c0';
    btn.style.transform = 'scale(1.05)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#1976d2';
    btn.style.transform = 'scale(1)';
  });

  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(desc);
  box.appendChild(btn);
  overlay.appendChild(box);

  return overlay;
}

function ensureRoomId(): Promise<string> {
  if (roomId) return Promise.resolve(roomId);
  return fetch('/').then(r => r.json()).then(data => {
    roomId = data.roomId;
    const newUrl = `${window.location.origin}/room/${roomId}`;
    window.history.replaceState({}, '', newUrl);
    const connRoomId = statusBarEl.querySelector('span:last-child');
    if (connRoomId) connRoomId.textContent = `房间: ${roomId}`;
    return roomId;
  });
}

async function init(): Promise<void> {
  await ensureRoomId();

  network = new NetworkClient(roomId, userId, userName, {
    onWelcome: (uid, color, users) => {
      userColor = color;
      if (canvas) canvas.setColor(color);
      updateStatusBar();
      if (chatPanel) chatPanel.updateUserList(users);
    },
    onUserJoined: (user: UserInfo) => {
      if (chatPanel) chatPanel.addUser(user);
    },
    onUserLeft: (uid: string) => {
      if (chatPanel) chatPanel.removeUser(uid);
    },
    onUserList: (users: UserInfo[]) => {
      if (chatPanel) chatPanel.updateUserList(users);
    },
    onToolChanged: (uid: string, tool: string, sw: number) => {
      if (chatPanel) chatPanel.updateUserTool(uid, tool, sw);
    },
    onHistory: (operations: (DrawOp | ChatMsg)[]) => {
      const drawOps: DrawOp[] = [];
      const chatMsgs: ChatMsg[] = [];
      for (const op of operations) {
        if (op.type === 'chat') {
          chatMsgs.push(op as ChatMsg);
        } else {
          drawOps.push(op as DrawOp);
        }
      }
      if (canvas) canvas.loadHistory(drawOps);
      if (chatPanel) chatPanel.loadHistory(chatMsgs);
    },
    onDraw: (op: DrawOp) => {
      if (canvas) canvas.handleRemoteDraw(op);
    },
    onChat: (msg: ChatMsg) => {
      if (chatPanel) chatPanel.addMessage(msg);
    },
    onStatusChange: (status: ConnectionStatus) => {
      updateConnectionStatus(status);
    }
  });

  network.connect();

  setInterval(() => {
    updateStatusBar();
  }, 200);

  window.addEventListener('beforeunload', () => {
    if (network) network.disconnect();
  });
}

init();
