export type CharacterMood = 'happy' | 'angry' | 'sad' | 'neutral';
export type VoteOption = 'A' | 'B' | 'C';
export type SceneType = 'castle' | 'forest' | 'cave' | 'gift' | 'badEnding' | 'normalEnding';
export type GamePhase = 'dialog' | 'voting' | 'reaction' | 'transition';

export interface VoteResults {
  A: number;
  B: number;
  C: number;
}

export interface SceneTransition {
  active: boolean;
  progress: number;
  direction: 'in' | 'out';
}

export interface Dialog {
  speaker: string;
  text: string;
  mood?: CharacterMood;
}

export interface SceneOption {
  key: VoteOption;
  text: string;
  color: string;
  affectionChange: number;
  nextSceneId: string;
  reactionMood: CharacterMood;
}

export interface SceneData {
  id: string;
  name: string;
  type: SceneType;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  characterPosition: { x: number; y: number };
  dialogs: Dialog[];
  options: SceneOption[];
  isEnding?: boolean;
}

export class GameState {
  private currentSceneId: string;
  private affection: number;
  private currentDialogIndex: number;
  private phase: GamePhase;
  private voteResults: VoteResults;
  private selectedOption: VoteOption | null;
  private characterMood: CharacterMood;
  private sceneTransition: SceneTransition;
  private scenes: Map<string, SceneData>;
  private affectionDisplayValue: number;
  private affectionAnimating: boolean;

  constructor() {
    this.currentSceneId = 'castle';
    this.affection = 0;
    this.affectionDisplayValue = 0;
    this.affectionAnimating = false;
    this.currentDialogIndex = 0;
    this.phase = 'dialog';
    this.voteResults = { A: 0, B: 0, C: 0 };
    this.selectedOption = null;
    this.characterMood = 'neutral';
    this.sceneTransition = { active: false, progress: 0, direction: 'in' };
    this.scenes = new Map();
    this.initScenes();
  }

  private initScenes(): void {
    const castleScene: SceneData = {
      id: 'castle',
      name: '城堡大厅',
      type: 'castle',
      colorScheme: {
        primary: '#8B6914',
        secondary: '#D4A84B',
        accent: '#FF6B35'
      },
      characterPosition: { x: 0.3, y: 0.65 },
      dialogs: [
        { speaker: '小骑士', text: '欢迎来到城堡大厅！我是守护这里的小骑士。', mood: 'happy' },
        { speaker: '小骑士', text: '前方有三条路可以走，你想选择哪一条呢？', mood: 'neutral' }
      ],
      options: [
        { key: 'A', text: '走进神秘的密林小径', color: '#e74c3c', affectionChange: 2, nextSceneId: 'forest', reactionMood: 'happy' },
        { key: 'B', text: '探索黑暗的地下洞穴', color: '#3498db', affectionChange: -1, nextSceneId: 'cave', reactionMood: 'sad' },
        { key: 'C', text: '留在城堡继续聊天', color: '#2ecc71', affectionChange: 3, nextSceneId: 'castle_talk', reactionMood: 'happy' }
      ]
    };

    const castleTalkScene: SceneData = {
      id: 'castle_talk',
      name: '城堡畅谈',
      type: 'castle',
      colorScheme: {
        primary: '#8B6914',
        secondary: '#D4A84B',
        accent: '#FF6B35'
      },
      characterPosition: { x: 0.35, y: 0.65 },
      dialogs: [
        { speaker: '小骑士', text: '太好了！有人愿意陪我聊天真开心~', mood: 'happy' },
        { speaker: '小骑士', text: '你知道吗？城堡的壁炉已经燃烧了一百年了哦！', mood: 'happy' },
        { speaker: '小骑士', text: '那么接下来，你想去哪里探险呢？', mood: 'neutral' }
      ],
      options: [
        { key: 'A', text: '去密林小径探险', color: '#e74c3c', affectionChange: 1, nextSceneId: 'forest', reactionMood: 'happy' },
        { key: 'B', text: '去地下洞穴冒险', color: '#3498db', affectionChange: -2, nextSceneId: 'cave', reactionMood: 'sad' },
        { key: 'C', text: '继续留在城堡', color: '#2ecc71', affectionChange: 2, nextSceneId: 'gift_check', reactionMood: 'happy' }
      ]
    };

    const forestScene: SceneData = {
      id: 'forest',
      name: '密林小径',
      type: 'forest',
      colorScheme: {
        primary: '#1B5E20',
        secondary: '#4CAF50',
        accent: '#FFEB3B'
      },
      characterPosition: { x: 0.25, y: 0.7 },
      dialogs: [
        { speaker: '小骑士', text: '哇，这里的森林好茂盛啊！阳光透过树叶洒下来...', mood: 'happy' },
        { speaker: '小骑士', text: '等等，前面好像有什么东西在动？', mood: 'neutral' },
        { speaker: '小骑士', text: '我们该怎么办呢？', mood: 'neutral' }
      ],
      options: [
        { key: 'A', text: '勇敢地向前查看', color: '#e74c3c', affectionChange: 2, nextSceneId: 'forest_brave', reactionMood: 'happy' },
        { key: 'B', text: '小心翼翼地绕过去', color: '#3498db', affectionChange: 0, nextSceneId: 'cave', reactionMood: 'neutral' },
        { key: 'C', text: '转身返回城堡', color: '#2ecc71', affectionChange: -2, nextSceneId: 'castle_talk', reactionMood: 'angry' }
      ]
    };

    const forestBraveScene: SceneData = {
      id: 'forest_brave',
      name: '森林奇遇',
      type: 'forest',
      colorScheme: {
        primary: '#1B5E20',
        secondary: '#4CAF50',
        accent: '#FFEB3B'
      },
      characterPosition: { x: 0.3, y: 0.7 },
      dialogs: [
        { speaker: '小骑士', text: '原来是一只可爱的小松鼠！', mood: 'happy' },
        { speaker: '小松鼠', text: '吱吱~谢谢你没有伤害我！', mood: 'happy' },
        { speaker: '小骑士', text: '这次冒险真有趣！接下来去哪里好呢？', mood: 'happy' }
      ],
      options: [
        { key: 'A', text: '继续深入森林', color: '#e74c3c', affectionChange: 1, nextSceneId: 'cave', reactionMood: 'happy' },
        { key: 'B', text: '返回城堡休息', color: '#3498db', affectionChange: 2, nextSceneId: 'gift_check', reactionMood: 'happy' },
        { key: 'C', text: '和小松鼠玩耍', color: '#2ecc71', affectionChange: 3, nextSceneId: 'gift_check', reactionMood: 'happy' }
      ]
    };

    const caveScene: SceneData = {
      id: 'cave',
      name: '地下洞穴',
      type: 'cave',
      colorScheme: {
        primary: '#1A237E',
        secondary: '#3F51B5',
        accent: '#00BCD4'
      },
      characterPosition: { x: 0.3, y: 0.72 },
      dialogs: [
        { speaker: '小骑士', text: '这里好黑啊...还好有萤火虫照亮。', mood: 'neutral' },
        { speaker: '小骑士', text: '钟乳石从头顶垂下来，感觉有点吓人...', mood: 'sad' },
        { speaker: '小骑士', text: '前面好像有三条岔路，选哪条好呢？', mood: 'neutral' }
      ],
      options: [
        { key: 'A', text: '走左边发光的路', color: '#e74c3c', affectionChange: -1, nextSceneId: 'cave_treasure', reactionMood: 'happy' },
        { key: 'B', text: '走中间滴水的路', color: '#3498db', affectionChange: -3, nextSceneId: 'cave_dark', reactionMood: 'sad' },
        { key: 'C', text: '走右边温暖的路', color: '#2ecc71', affectionChange: 1, nextSceneId: 'forest_brave', reactionMood: 'happy' }
      ]
    };

    const caveTreasureScene: SceneData = {
      id: 'cave_treasure',
      name: '宝藏密室',
      type: 'cave',
      colorScheme: {
        primary: '#FFD700',
        secondary: '#FFA000',
        accent: '#FF6B35'
      },
      characterPosition: { x: 0.3, y: 0.7 },
      dialogs: [
        { speaker: '小骑士', text: '哇！是宝藏！闪闪发光的金币！', mood: 'happy' },
        { speaker: '小骑士', text: '虽然有点阴森，但能发现宝藏真是太棒了！', mood: 'happy' },
        { speaker: '小骑士', text: '我们带着宝藏回去吧！', mood: 'happy' }
      ],
      options: [
        { key: 'A', text: '带着宝藏返回', color: '#e74c3c', affectionChange: 2, nextSceneId: 'normalEnding', reactionMood: 'happy' },
        { key: 'B', text: '继续探索更深', color: '#3498db', affectionChange: -2, nextSceneId: 'cave_dark', reactionMood: 'angry' },
        { key: 'C', text: '把宝藏留给后来人', color: '#2ecc71', affectionChange: 3, nextSceneId: 'gift_check', reactionMood: 'happy' }
      ]
    };

    const caveDarkScene: SceneData = {
      id: 'cave_dark',
      name: '黑暗深渊',
      type: 'cave',
      colorScheme: {
        primary: '#0D0D0D',
        secondary: '#212121',
        accent: '#B71C1C'
      },
      characterPosition: { x: 0.3, y: 0.72 },
      dialogs: [
        { speaker: '小骑士', text: '这里好黑...我什么都看不见了...', mood: 'sad' },
        { speaker: '小骑士', text: '好像迷路了...怎么办...', mood: 'sad' }
      ],
      options: [
        { key: 'A', text: '凭感觉往前走', color: '#e74c3c', affectionChange: -2, nextSceneId: 'badEnding', reactionMood: 'sad' },
        { key: 'B', text: '原地等待救援', color: '#3498db', affectionChange: -1, nextSceneId: 'badEnding', reactionMood: 'sad' },
        { key: 'C', text: '大声呼救', color: '#2ecc71', affectionChange: 0, nextSceneId: 'forest_brave', reactionMood: 'happy' }
      ]
    };

    const giftCheckScene: SceneData = {
      id: 'gift_check',
      name: '神秘礼物',
      type: 'gift',
      colorScheme: {
        primary: '#7B1FA2',
        secondary: '#CE93D8',
        accent: '#FFD700'
      },
      characterPosition: { x: 0.3, y: 0.68 },
      dialogs: [
        { speaker: '小骑士', text: '诶？这里怎么有一个闪闪发光的礼物盒？', mood: 'neutral' },
        { speaker: '小骑士', text: '是送给我的吗？好开心！', mood: 'happy' },
        { speaker: '小骑士', text: '谢谢你陪我度过这么棒的冒险！', mood: 'happy' }
      ],
      options: [
        { key: 'A', text: '打开礼物', color: '#e74c3c', affectionChange: 2, nextSceneId: 'normalEnding', reactionMood: 'happy' },
        { key: 'B', text: '珍藏礼物', color: '#3498db', affectionChange: 1, nextSceneId: 'normalEnding', reactionMood: 'happy' },
        { key: 'C', text: '和小骑士一起打开', color: '#2ecc71', affectionChange: 3, nextSceneId: 'normalEnding', reactionMood: 'happy' }
      ]
    };

    const normalEndingScene: SceneData = {
      id: 'normalEnding',
      name: '冒险结束',
      type: 'normalEnding',
      colorScheme: {
        primary: '#FF8F00',
        secondary: '#FFB74D',
        accent: '#FFEB3B'
      },
      characterPosition: { x: 0.35, y: 0.65 },
      dialogs: [
        { speaker: '小骑士', text: '今天的冒险就到这里啦！', mood: 'happy' },
        { speaker: '小骑士', text: '下次再一起去更多好玩的地方吧！', mood: 'happy' },
        { speaker: '系统', text: '— 普通结局 —', mood: 'neutral' }
      ],
      options: [],
      isEnding: true
    };

    const badEndingScene: SceneData = {
      id: 'badEnding',
      name: '迷失深渊',
      type: 'badEnding',
      colorScheme: {
        primary: '#1A1A2E',
        secondary: '#16213E',
        accent: '#E94560'
      },
      characterPosition: { x: 0.4, y: 0.7 },
      dialogs: [
        { speaker: '小骑士', text: '...', mood: 'sad' },
        { speaker: '小骑士', text: '好黑...好冷...', mood: 'sad' },
        { speaker: '系统', text: '— 坏结局：迷失深渊 —', mood: 'neutral' }
      ],
      options: [],
      isEnding: true
    };

    this.scenes.set('castle', castleScene);
    this.scenes.set('castle_talk', castleTalkScene);
    this.scenes.set('forest', forestScene);
    this.scenes.set('forest_brave', forestBraveScene);
    this.scenes.set('cave', caveScene);
    this.scenes.set('cave_treasure', caveTreasureScene);
    this.scenes.set('cave_dark', caveDarkScene);
    this.scenes.set('gift_check', giftCheckScene);
    this.scenes.set('normalEnding', normalEndingScene);
    this.scenes.set('badEnding', badEndingScene);
  }

  getCurrentScene(): SceneData {
    const scene = this.scenes.get(this.currentSceneId);
    if (!scene) {
      throw new Error(`Scene not found: ${this.currentSceneId}`);
    }
    return scene;
  }

  getCurrentSceneId(): string {
    return this.currentSceneId;
  }

  getCurrentDialog(): Dialog | null {
    const scene = this.getCurrentScene();
    if (this.currentDialogIndex < scene.dialogs.length) {
      return scene.dialogs[this.currentDialogIndex];
    }
    return null;
  }

  getCurrentDialogIndex(): number {
    return this.currentDialogIndex;
  }

  advanceDialog(): boolean {
    const scene = this.getCurrentScene();
    if (this.currentDialogIndex < scene.dialogs.length - 1) {
      this.currentDialogIndex++;
      const dialog = scene.dialogs[this.currentDialogIndex];
      if (dialog.mood) {
        this.characterMood = dialog.mood;
      }
      return true;
    }
    return false;
  }

  hasMoreDialogs(): boolean {
    const scene = this.getCurrentScene();
    return this.currentDialogIndex < scene.dialogs.length - 1;
  }

  isDialogComplete(): boolean {
    const scene = this.getCurrentScene();
    return this.currentDialogIndex >= scene.dialogs.length - 1;
  }

  getAffection(): number {
    return this.affection;
  }

  getAffectionDisplayValue(): number {
    return this.affectionDisplayValue;
  }

  isAffectionAnimating(): boolean {
    return this.affectionAnimating;
  }

  setAffectionAnimating(value: boolean): void {
    this.affectionAnimating = value;
  }

  updateAffectionDisplayValue(value: number): void {
    this.affectionDisplayValue = value;
  }

  setAffection(value: number): void {
    this.affection = Math.max(-10, Math.min(10, value));
  }

  addAffection(delta: number): void {
    this.affection = Math.max(-10, Math.min(10, this.affection + delta));
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  setPhase(phase: GamePhase): void {
    this.phase = phase;
  }

  getVoteResults(): VoteResults {
    return { ...this.voteResults };
  }

  addVote(option: VoteOption): void {
    this.voteResults[option]++;
  }

  resetVotes(): void {
    this.voteResults = { A: 0, B: 0, C: 0 };
    this.selectedOption = null;
  }

  getSelectedOption(): VoteOption | null {
    return this.selectedOption;
  }

  setSelectedOption(option: VoteOption | null): void {
    this.selectedOption = option;
  }

  getCharacterMood(): CharacterMood {
    return this.characterMood;
  }

  setCharacterMood(mood: CharacterMood): void {
    this.characterMood = mood;
  }

  getSceneTransition(): SceneTransition {
    return { ...this.sceneTransition };
  }

  setSceneTransition(transition: SceneTransition): void {
    this.sceneTransition = { ...transition };
  }

  goToScene(sceneId: string): void {
    if (!this.scenes.has(sceneId)) {
      console.warn(`Scene not found: ${sceneId}, defaulting to castle`);
      this.currentSceneId = 'castle';
    } else {
      this.currentSceneId = sceneId;
    }
    this.currentDialogIndex = 0;
    const scene = this.getCurrentScene();
    if (scene.dialogs.length > 0 && scene.dialogs[0].mood) {
      this.characterMood = scene.dialogs[0].mood;
    }
  }

  checkSpecialEndings(): string | null {
    if (this.affection >= 5) {
      return 'gift_check';
    }
    if (this.affection <= -5) {
      return 'badEnding';
    }
    return null;
  }

  isEnding(): boolean {
    return this.getCurrentScene().isEnding === true;
  }

  getOptions(): SceneOption[] {
    return this.getCurrentScene().options;
  }

  reset(): void {
    this.currentSceneId = 'castle';
    this.affection = 0;
    this.affectionDisplayValue = 0;
    this.affectionAnimating = false;
    this.currentDialogIndex = 0;
    this.phase = 'dialog';
    this.voteResults = { A: 0, B: 0, C: 0 };
    this.selectedOption = null;
    this.characterMood = 'neutral';
    this.sceneTransition = { active: false, progress: 0, direction: 'in' };
  }
}
