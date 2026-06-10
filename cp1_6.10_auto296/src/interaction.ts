export type EmotionType =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'calm'
  | 'surprise'
  | 'fear'
  | 'disgust'
  | 'love';

export interface EmotionInfo {
  type: EmotionType;
  name: string;
  emoji: string;
}

export const EMOTIONS: Record<EmotionType, EmotionInfo> = {
  joy: { type: 'joy', name: '喜悦', emoji: '😊' },
  sadness: { type: 'sadness', name: '悲伤', emoji: '😢' },
  anger: { type: 'anger', name: '愤怒', emoji: '😠' },
  calm: { type: 'calm', name: '平静', emoji: '😌' },
  surprise: { type: 'surprise', name: '惊讶', emoji: '😲' },
  fear: { type: 'fear', name: '恐惧', emoji: '😨' },
  disgust: { type: 'disgust', name: '厌恶', emoji: '🤢' },
  love: { type: 'love', name: '爱', emoji: '❤️' }
};

const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  joy: [
    '开心', '高兴', '快乐', '喜悦', '兴奋', '愉快', '欢乐', '幸福',
    '满足', '愉悦', '欣喜', '畅快', '舒畅', '乐呵呵', '笑嘻嘻',
    '雀跃', '欢腾', '兴高采烈', '心花怒放', '喜出望外'
  ],
  sadness: [
    '难过', '伤心', '悲伤', '哀伤', '忧郁', '沮丧', '失落', '惆怅',
    '苦闷', '心酸', '心碎', '流泪', '哭泣', '凄凉', '悲凉',
    '郁郁寡欢', '闷闷不乐', '黯然神伤', '悲痛欲绝', '心如刀割'
  ],
  anger: [
    '生气', '愤怒', '恼火', '暴怒', '气愤', '愤恨', '恼怒', '怒火',
    '暴躁', '烦躁', '愤慨', '怒不可遏', '火冒三丈', '暴跳如雷',
    '咬牙切齿', '七窍生烟', '勃然大怒', '大发雷霆', '恼羞成怒',
    '怒气冲冲'
  ],
  calm: [
    '平静', '安静', '宁静', '平和', '淡定', '从容', '舒缓', '安稳',
    '安详', '闲适', '悠然', '恬静', '心旷神怡', '心如止水',
    '泰然自若', '悠然自得', '心平气和', '安稳', '安心', '放松'
  ],
  surprise: [
    '惊讶', '吃惊', '惊奇', '诧异', '震惊', '意外', '惊喜', '震撼',
    '惊异', '惊愕', '错愕', '瞠目结舌', '大吃一惊', '始料未及',
    '出乎意料', '震惊', '叹为观止', '骇然', '咋舌', '惊喜交加'
  ],
  fear: [
    '害怕', '恐惧', '担心', '忧虑', '焦虑', '不安', '紧张', '惶恐',
    '惊恐', '畏惧', '恐慌', '心惊', '胆战', '忐忑', '心慌',
    '心惊肉跳', '胆战心惊', '惶恐不安', '毛骨悚然', '不寒而栗'
  ],
  disgust: [
    '厌恶', '恶心', '讨厌', '反感', '厌烦', '憎恶', '鄙视', '唾弃',
    '鄙夷', '嫌恶', '作呕', '不屑', '嗤之以鼻', '令人作呕',
    '深恶痛绝', '恨之入骨', '咬牙切齿', '轻蔑', '嫌弃', '腻烦'
  ],
  love: [
    '爱', '喜欢', '爱恋', '热爱', '甜蜜', '温馨', '浪漫', '心动',
    '想念', '思念', '眷恋', '柔情', '爱意', '钟爱', '珍爱',
    '深情厚谊', '柔情蜜意', '心心相印', '如胶似漆', '一往情深'
  ]
};

type EmotionChangeCallback = (emotion: EmotionType) => void;

export class InteractionManager {
  private callbacks: EmotionChangeCallback[] = [];
  private currentEmotion: EmotionType = 'calm';
  private matchTip: HTMLElement;
  private emotionButtons: NodeListOf<HTMLElement>;
  private emotionInput: HTMLInputElement;
  private submitButton: HTMLElement;

  constructor() {
    this.emotionButtons = document.querySelectorAll('.emotion-btn');
    this.emotionInput = document.getElementById('emotion-input') as HTMLInputElement;
    this.submitButton = document.getElementById('submit-btn') as HTMLElement;
    this.matchTip = document.getElementById('match-tip') as HTMLElement;

    this.bindEvents();
    this.updateActiveButton(this.currentEmotion);
  }

  private bindEvents(): void {
    this.emotionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const emotion = btn.dataset.emotion as EmotionType;
        if (emotion && emotion !== this.currentEmotion) {
          this.setEmotion(emotion);
        }
      });
    });

    this.submitButton.addEventListener('click', () => {
      this.handleInputSubmit();
    });

    this.emotionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleInputSubmit();
      }
    });
  }

  private handleInputSubmit(): void {
    const text = this.emotionInput.value.trim();
    if (!text) return;

    const matchedEmotion = this.matchEmotion(text);
    this.emotionInput.value = '';
    this.setEmotion(matchedEmotion, text);
  }

  private matchEmotion(text: string): EmotionType {
    let bestMatch: EmotionType = 'calm';
    let bestScore = 0;

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += keyword.length;
        }
      }
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        for (const keyword of keywords) {
          if (keyword.includes(char)) {
            score += 0.5;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = emotion as EmotionType;
      }
    }

    return bestMatch;
  }

  private setEmotion(emotion: EmotionType, inputText?: string): void {
    this.currentEmotion = emotion;
    this.updateActiveButton(emotion);

    if (inputText) {
      this.showMatchTip(emotion, inputText);
    }

    this.callbacks.forEach((cb) => cb(emotion));
  }

  private updateActiveButton(emotion: EmotionType): void {
    this.emotionButtons.forEach((btn) => {
      if (btn.dataset.emotion === emotion) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private showMatchTip(emotion: EmotionType, inputText: string): void {
    const info = EMOTIONS[emotion];
    this.matchTip.innerHTML = `<span class="emoji">${info.emoji}</span>匹配到情绪：<span class="emotion-name">${info.name}</span>`;
    this.matchTip.classList.add('show');

    setTimeout(() => {
      this.matchTip.classList.remove('show');
    }, 2500);
  }

  public onEmotionChange(callback: EmotionChangeCallback): void {
    this.callbacks.push(callback);
  }

  public getCurrentEmotion(): EmotionType {
    return this.currentEmotion;
  }
}
