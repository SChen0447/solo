import type { UserInfo, ChatMsg } from './network';

export interface ChatCallbacks {
  onSendMessage: (text: string) => void;
}

export class ChatPanel {
  private container: HTMLElement;
  private callbacks: ChatCallbacks;
  private users: Map<string, UserInfo> = new Map();
  private messages: ChatMsg[] = [];
  private isExpanded = false;
  private hoverTimer: number | null = null;

  private panel!: HTMLElement;
  private tab!: HTMLElement;
  private userListEl!: HTMLElement;
  private messageListEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendBtn!: HTMLElement;

  constructor(container: HTMLElement, callbacks: ChatCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.buildUI();
  }

  private buildUI(): void {
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      display: flex;
      z-index: 100;
      font-family: 'Inter', sans-serif;
    `;

    this.tab = document.createElement('div');
    this.tab.style.cssText = `
      width: 48px;
      height: 100%;
      background: #fff;
      border-left: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 16px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    `;
    this.tab.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 24px; color: #666; margin-bottom: 8px;">chat</span>
      <span style="writing-mode: vertical-rl; font-size: 12px; color: #666; transform: rotate(180deg);">聊天 / 用户</span>
    `;
    this.tab.addEventListener('mouseenter', () => this.expand());
    this.tab.addEventListener('click', () => this.toggle());

    const content = document.createElement('div');
    content.style.cssText = `
      width: 320px;
      height: 100%;
      background: #fff;
      border-left: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    const userSection = document.createElement('div');
    userSection.style.cssText = `
      padding: 12px;
      border-bottom: 1px solid #eee;
      max-height: 180px;
      overflow-y: auto;
    `;
    const userTitle = document.createElement('div');
    userTitle.style.cssText = 'font-size: 13px; font-weight: 600; color: #333; margin-bottom: 8px;';
    userTitle.textContent = '在线用户';
    this.userListEl = document.createElement('div');
    this.userListEl.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
    userSection.appendChild(userTitle);
    userSection.appendChild(this.userListEl);

    const chatSection = document.createElement('div');
    chatSection.style.cssText = 'flex: 1; display: flex; flex-direction: column; min-height: 0;';

    const chatTitle = document.createElement('div');
    chatTitle.style.cssText = 'padding: 8px 12px; font-size: 13px; font-weight: 600; color: #333; border-bottom: 1px solid #eee;';
    chatTitle.textContent = '聊天';

    this.messageListEl = document.createElement('div');
    this.messageListEl.style.cssText = 'flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column;';

    const inputSection = document.createElement('div');
    inputSection.style.cssText = 'padding: 12px; border-top: 1px solid #eee; display: flex; gap: 8px;';

    this.inputEl = document.createElement('textarea');
    this.inputEl.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      resize: none;
      height: 40px;
      outline: none;
      transition: border-color 0.2s ease;
    `;
    this.inputEl.placeholder = '输入消息...';
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.inputEl.addEventListener('focus', () => {
      this.inputEl.style.borderColor = '#1976d2';
    });
    this.inputEl.addEventListener('blur', () => {
      this.inputEl.style.borderColor = '#ddd';
    });

    this.sendBtn = document.createElement('button');
    this.sendBtn.style.cssText = `
      padding: 8px 16px;
      background: #1976d2;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      height: 40px;
    `;
    this.sendBtn.textContent = '发送';
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.sendBtn.addEventListener('mouseenter', () => {
      this.sendBtn.style.background = '#1565c0';
      this.sendBtn.style.transform = 'scale(1.05)';
    });
    this.sendBtn.addEventListener('mouseleave', () => {
      this.sendBtn.style.background = '#1976d2';
      this.sendBtn.style.transform = 'scale(1)';
    });

    inputSection.appendChild(this.inputEl);
    inputSection.appendChild(this.sendBtn);

    chatSection.appendChild(chatTitle);
    chatSection.appendChild(this.messageListEl);
    chatSection.appendChild(inputSection);

    content.appendChild(userSection);
    content.appendChild(chatSection);

    this.panel.appendChild(this.tab);
    this.panel.appendChild(content);

    content.style.display = 'none';
    this.container.appendChild(this.panel);

    this.panel.addEventListener('mouseleave', () => {
      if (!this.isExpanded) {
        this.scheduleCollapse();
      }
    });
    this.panel.addEventListener('mouseenter', () => {
      if (this.hoverTimer) {
        window.clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
    });
  }

  private expand(): void {
    if (this.hoverTimer) {
      window.clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    const content = this.panel.querySelector('div:nth-child(2)') as HTMLElement;
    if (content) content.style.display = 'flex';
  }

  private collapse(): void {
    if (this.isExpanded) return;
    const content = this.panel.querySelector('div:nth-child(2)') as HTMLElement;
    if (content) content.style.display = 'none';
  }

  private scheduleCollapse(): void {
    if (this.hoverTimer) window.clearTimeout(this.hoverTimer);
    this.hoverTimer = window.setTimeout(() => this.collapse(), 300);
  }

  private toggle(): void {
    this.isExpanded = !this.isExpanded;
    const content = this.panel.querySelector('div:nth-child(2)') as HTMLElement;
    if (this.isExpanded) {
      if (content) content.style.display = 'flex';
    } else {
      if (content) content.style.display = 'none';
    }
  }

  private sendMessage(): void {
    const text = this.inputEl.value.trim();
    if (!text) return;
    this.callbacks.onSendMessage(text);
    this.inputEl.value = '';
  }

  updateUserList(users: UserInfo[]): void {
    this.users.clear();
    for (const user of users) {
      this.users.set(user.id, user);
    }
    this.renderUserList();
  }

  addUser(user: UserInfo): void {
    this.users.set(user.id, user);
    this.renderUserList();
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
    this.renderUserList();
  }

  updateUserTool(userId: string, tool: string, strokeWidth: number): void {
    const user = this.users.get(userId);
    if (user) {
      user.tool = tool;
      user.strokeWidth = strokeWidth;
      this.renderUserList();
    }
  }

  private renderUserList(): void {
    this.userListEl.innerHTML = '';
    for (const user of this.users.values()) {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; align-items: center; gap: 8px;';

      const avatar = document.createElement('div');
      avatar.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${user.color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 600;
        font-size: 14px;
        flex-shrink: 0;
      `;
      avatar.textContent = user.name.charAt(0).toUpperCase();

      const info = document.createElement('div');
      info.style.cssText = 'display: flex; flex-direction: column; min-width: 0;';

      const name = document.createElement('div');
      name.style.cssText = 'font-size: 13px; font-weight: 500; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
      name.textContent = user.name;

      const details = document.createElement('div');
      details.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 11px; color: #888;';
      details.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${user.color};"></span>
        <span>${this.toolToName(user.tool)} · ${user.strokeWidth}px</span>
      `;

      info.appendChild(name);
      info.appendChild(details);
      item.appendChild(avatar);
      item.appendChild(info);
      this.userListEl.appendChild(item);
    }
  }

  private toolToName(tool: string): string {
    const map: Record<string, string> = {
      pen: '画笔',
      line: '直线',
      rectangle: '矩形',
      circle: '圆形',
      note: '便签'
    };
    return map[tool] || tool;
  }

  addMessage(msg: ChatMsg): void {
    this.messages.push(msg);
    this.renderMessage(msg);
  }

  loadHistory(messages: ChatMsg[]): void {
    this.messages = messages;
    this.messageListEl.innerHTML = '';
    for (const msg of messages) {
      this.renderMessage(msg);
    }
  }

  private renderMessage(msg: ChatMsg): void {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom: 8px; display: flex; gap: 8px; align-items: flex-start;';

    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${msg.color};
      flex-shrink: 0;
      margin-top: 6px;
    `;

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      background: #fff;
      border-radius: 12px;
      padding: 8px 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      flex: 1;
      min-width: 0;
      border: 1px solid #f0f0f0;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';

    const nameEl = document.createElement('span');
    nameEl.style.cssText = 'font-size: 12px; font-weight: 600; color: #333;';
    nameEl.textContent = msg.userName;

    const timeEl = document.createElement('span');
    timeEl.style.cssText = 'font-size: 11px; color: #999;';
    const date = new Date(msg.timestamp);
    timeEl.textContent = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    const textEl = document.createElement('div');
    textEl.style.cssText = 'font-size: 14px; line-height: 1.5; color: #333; word-break: break-word; white-space: pre-wrap;';
    textEl.textContent = msg.text;

    header.appendChild(nameEl);
    header.appendChild(timeEl);
    bubble.appendChild(header);
    bubble.appendChild(textEl);
    wrap.appendChild(dot);
    wrap.appendChild(bubble);

    this.messageListEl.appendChild(wrap);
    this.messageListEl.scrollTop = this.messageListEl.scrollHeight;
  }
}
