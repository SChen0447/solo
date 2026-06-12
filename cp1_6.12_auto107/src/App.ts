import { WallEngine } from './WallEngine';

const EMOJI_LIST = [
  '😊', '🥰', '😍', '❤️', '💕', '🎉', '🎊', '💖',
  '🌹', '✨', '🌟', '💐', '🥂', '💍', '👰', '🤵',
  '💝', '💞', '💗', '🍀', '🌈', '🎈', '🎀', '🦋',
];

interface BlessingMessage {
  type: string;
  name: string;
  text: string;
  emoji: string;
  time: string;
}

export class App {
  private ws: WebSocket | null = null;
  private wallEngine: WallEngine | null = null;
  private selectedEmoji: string = '';
  private emojiPanelOpen: boolean = false;

  constructor() {
    this.initSigninPage();
    this.connectWebSocket();
  }

  private initSigninPage(): void {
    const emojiToggle = document.getElementById('emoji-toggle')!;
    const emojiPanel = document.getElementById('emoji-panel')!;
    const submitBtn = document.getElementById('submit-btn')!;

    EMOJI_LIST.forEach((emoji) => {
      const item = document.createElement('span');
      item.className = 'emoji-item';
      item.textContent = emoji;
      item.addEventListener('click', () => this.selectEmoji(emoji));
      emojiPanel.appendChild(item);
    });

    emojiToggle.addEventListener('click', () => this.toggleEmojiPanel());

    submitBtn.addEventListener('click', () => this.submitBlessing());
  }

  private selectEmoji(emoji: string): void {
    this.selectedEmoji = emoji;
    const display = document.getElementById('selected-emoji')!;
    display.textContent = emoji;
    this.toggleEmojiPanel();
  }

  private toggleEmojiPanel(): void {
    const panel = document.getElementById('emoji-panel')!;
    if (this.emojiPanelOpen) {
      panel.classList.remove('visible');
      setTimeout(() => {
        if (!this.emojiPanelOpen) {
          panel.style.display = 'none';
        }
      }, 300);
    } else {
      panel.style.display = 'flex';
      requestAnimationFrame(() => {
        panel.classList.add('visible');
      });
    }
    this.emojiPanelOpen = !this.emojiPanelOpen;
  }

  private async submitBlessing(): Promise<void> {
    const textarea = document.getElementById('blessing-input') as HTMLTextAreaElement;
    const text = textarea.value.trim();
    if (!text) return;

    const data = {
      name: '宾客',
      text,
      emoji: this.selectedEmoji || '😊',
    };

    try {
      await fetch('http://localhost:8000/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      console.warn('签到接口请求失败，仍切换到大屏');
    }

    this.switchToWall();
  }

  private switchToWall(): void {
    const signinPage = document.getElementById('page-signin')!;
    const wallPage = document.getElementById('page-wall')!;
    signinPage.classList.add('hidden');
    wallPage.classList.add('active');

    const canvas = document.getElementById('blessing-canvas') as HTMLCanvasElement;
    this.wallEngine = new WallEngine(canvas);
    this.wallEngine.start();
  }

  private connectWebSocket(): void {
    const connect = () => {
      this.ws = new WebSocket('ws://localhost:8000/ws');

      this.ws.onopen = () => {
        console.log('WebSocket 已连接');
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: BlessingMessage = JSON.parse(event.data);
          if (msg.type === 'blessing' && this.wallEngine) {
            this.wallEngine.addBlessing(msg);
          }
        } catch {
          console.warn('WebSocket 消息解析失败');
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket 断开，3秒后重连…');
        setTimeout(connect, 3000);
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    };

    connect();
  }
}

new App();
