import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, ReadingPlan, Annotation, ChatMessage, UserProgress, AppState, Action } from './types';

const STORAGE_KEY = 'reading-circle-data';

const mockUsers: User[] = [
  { id: 'u1', name: '林墨白', avatar: '墨' },
  { id: 'u2', name: '苏清欢', avatar: '苏' },
  { id: 'u3', name: '陈星河', avatar: '陈' },
  { id: 'u4', name: '沈听雨', avatar: '沈' },
  { id: 'u5', name: '顾南舟', avatar: '顾' }
];

const currentUser: User = mockUsers[0];

const mockReadingPlans: ReadingPlan[] = [
  {
    id: 'r1',
    bookTitle: '百年孤独',
    bookAuthor: '加西亚·马尔克斯',
    bookCover: '',
    bookPages: 360,
    startDate: '2026-05-15',
    endDate: '2026-06-30',
    description: '布恩迪亚家族七代人的传奇故事，魔幻现实主义文学的代表作。在马孔多这个虚构的小镇上，时间与记忆、孤独与爱交织成一幅波澜壮阔的画卷。',
    members: ['u1', 'u2', 'u3', 'u4'],
    progress: 68
  },
  {
    id: 'r2',
    bookTitle: '1984',
    bookAuthor: '乔治·奥威尔',
    bookCover: '',
    bookPages: 328,
    startDate: '2026-06-01',
    endDate: '2026-07-15',
    description: '反乌托邦文学的经典之作。在老大哥注视下的大洋国，温斯顿试图找回真实的自我与思想的自由。一部令人警醒的政治寓言。',
    members: ['u1', 'u3', 'u5'],
    progress: 35
  },
  {
    id: 'r3',
    bookTitle: '小王子',
    bookAuthor: '安托万·德·圣-埃克苏佩里',
    bookCover: '',
    bookPages: 96,
    startDate: '2026-06-10',
    endDate: '2026-06-25',
    description: '写给所有大人的童话。小王子在星际旅行中遇见了国王、虚荣的人、商人、点灯人，最终在地球上领悟了爱与责任的真谛。',
    members: ['u1', 'u2', 'u4', 'u5'],
    progress: 82
  },
  {
    id: 'r4',
    bookTitle: '追风筝的人',
    bookAuthor: '卡勒德·胡赛尼',
    bookCover: '',
    bookPages: 371,
    startDate: '2026-05-20',
    endDate: '2026-07-10',
    description: '关于友谊、背叛与救赎的动人故事。阿富汗富家少爷阿米尔与仆人哈桑之间的情感纠葛，跨越数十年的时空，寻找再次成为好人的路。',
    members: ['u2', 'u3', 'u4'],
    progress: 45
  },
  {
    id: 'r5',
    bookTitle: '月亮与六便士',
    bookAuthor: '威廉·萨默塞特·毛姆',
    bookCover: '',
    bookPages: 314,
    startDate: '2026-06-05',
    endDate: '2026-07-20',
    description: '以画家高更为原型的小说。伦敦证券经纪人思特里克兰德抛妻弃子，奔赴南太平洋的塔希提岛，用画笔谱写自己辉煌的生命乐章。',
    members: ['u1', 'u5'],
    progress: 22
  },
  {
    id: 'r6',
    bookTitle: '局外人',
    bookAuthor: '阿尔贝·加缪',
    bookCover: '',
    bookPages: 154,
    startDate: '2026-06-15',
    endDate: '2026-07-05',
    description: '存在主义文学的代表作。默尔索在母亲的葬礼上没有流泪，在阳光的眩晕下开枪杀人。他是这个世界的局外人，也是诚实的异类。',
    members: ['u2', 'u3', 'u5'],
    progress: 10
  }
];

const now = Date.now();
const hr = 60 * 60 * 1000;

const mockAnnotations: Annotation[] = [
  { id: 'a1', readingId: 'r1', userId: 'u2', userName: '苏清欢', pageNumber: 47, content: '多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。这个开头实在太惊艳了，时间的循环感扑面而来。', createdAt: now - 48 * hr },
  { id: 'a2', readingId: 'r1', userId: 'u3', userName: '陈星河', pageNumber: 112, content: '丽贝卡吃泥土和石灰的情节让我震撼，这是一种怎样的孤独与痛苦？马尔克斯用魔幻的笔触写出了最真实的人性。', createdAt: now - 36 * hr },
  { id: 'a3', readingId: 'r1', userId: 'u4', userName: '沈听雨', pageNumber: 189, content: '阿玛兰妲和丽贝卡之间的争斗是布恩迪亚家族命运的缩影，她们各自困在自己的孤独牢笼里，用伤害彼此来证明自己的存在。', createdAt: now - 24 * hr },
  { id: 'a4', readingId: 'r1', userId: 'u1', userName: '林墨白', pageNumber: 234, content: '羊皮卷上的预言与现实的交织，马尔克斯让我相信一切都早已写定，但每个人依然在奋力书写自己的命运。这种宿命感既绝望又迷人。', createdAt: now - 12 * hr },
  { id: 'a5', readingId: 'r1', userId: 'u2', userName: '苏清欢', pageNumber: 278, content: '最后那场飓风，马孔多从地球上消失，就像从未存在过一样。读完这一段，我怔怔地坐了很久，好像自己也经历了一场百年的幻梦。', createdAt: now - 6 * hr },
  { id: 'a6', readingId: 'r2', userId: 'u3', userName: '陈星河', pageNumber: 23, content: '"战争就是和平，自由就是奴役，无知就是力量。" 每次看到这句话都脊背发凉。奥威尔的预言正在以另一种方式成为现实。', createdAt: now - 72 * hr },
  { id: 'a7', readingId: 'r2', userId: 'u5', userName: '顾南舟', pageNumber: 89, content: '温斯顿写日记的场景，是对思想自由最卑微也最勇敢的反抗。在一个连表情都可能获罪的世界里，文字是最后的避难所。', createdAt: now - 48 * hr },
  { id: 'a8', readingId: 'r2', userId: 'u1', userName: '林墨白', pageNumber: 156, content: '朱莉娅和温斯顿的爱情，是在极权荒漠中开出的最脆弱也最珍贵的花。我知道它注定要凋零，但还是为它短暂的绽放而动容。', createdAt: now - 24 * hr },
  { id: 'a9', readingId: 'r3', userId: 'u2', userName: '苏清欢', pageNumber: 18, content: '"真正重要的东西，用眼睛是看不见的。" 狐狸对小王子说的这句话，我读了无数遍，每次都有新的体会。', createdAt: now - 96 * hr },
  { id: 'a10', readingId: 'r3', userId: 'u4', userName: '沈听雨', pageNumber: 45, content: '小王子遇见了那么多人，每个大人都在自己的星球上忙碌着，却不知道自己在寻找什么。我们又何尝不是这样呢？', createdAt: now - 60 * hr },
  { id: 'a11', readingId: 'r3', userId: 'u1', userName: '林墨白', pageNumber: 72, content: '"你要对你驯服过的一切负责到底。" 这句话不仅仅是关于爱情，更是关于所有我们选择投入情感的事物。', createdAt: now - 36 * hr },
  { id: 'a12', readingId: 'r3', userId: 'u5', userName: '顾南舟', pageNumber: 88, content: '小王子选择回到他的玫瑰身边，即使那朵玫瑰曾经让他伤心。爱不是完美，而是选择和承担。这个结局让我泪流满面。', createdAt: now - 12 * hr }
];

const mockChatMessages: ChatMessage[] = [
  { id: 'c1', readingId: 'r1', userId: 'u2', userName: '苏清欢', content: '大家今天读到哪里了？我刚看到丽贝卡回到布恩迪亚家那段，心里好压抑啊。', createdAt: now - 120 * hr },
  { id: 'c2', readingId: 'r1', userId: 'u3', userName: '陈星河', content: '我读到第180页了，乌尔苏拉真是这个家族的灵魂人物，她活了那么久，见证了一切的兴衰。', createdAt: now - 118 * hr },
  { id: 'c3', readingId: 'r1', userId: 'u4', userName: '沈听雨', content: '我觉得乌尔苏拉是整本书里最清醒的人，她知道家族的命运却无力改变，这种清醒本身就是一种折磨。', createdAt: now - 115 * hr },
  { id: 'c4', readingId: 'r1', userId: 'u1', userName: '林墨白', content: '赞同。马尔克斯笔下的女性都很坚韧，乌尔苏拉、阿玛兰妲、蕾梅黛丝，每个人物都让人难忘。', createdAt: now - 110 * hr },
  { id: 'c5', readingId: 'r1', userId: 'u2', userName: '苏清欢', content: '有谁和我一样，看到俏姑娘蕾梅黛丝升天那段，既觉得荒诞又觉得好美？', createdAt: now - 96 * hr },
  { id: 'c6', readingId: 'r1', userId: 'u3', userName: '陈星河', content: '那段我反复读了三遍！马尔克斯写死亡和离别总是那么轻盈，仿佛一切都是自然而然的。', createdAt: now - 92 * hr },
  { id: 'c7', readingId: 'r1', userId: 'u4', userName: '沈听雨', content: '提醒大家本周六晚上8点线上讨论哦，主题是"孤独的七种形态"，请大家准备一下自己最有感触的片段。', createdAt: now - 48 * hr },
  { id: 'c8', readingId: 'r1', userId: 'u1', userName: '林墨白', content: '收到！我准备分享奥雷里亚诺上校晚年制作小金鱼那段，那个循环往复的意象太震撼了。', createdAt: now - 46 * hr },
  { id: 'c9', readingId: 'r1', userId: 'u2', userName: '苏清欢', content: '好期待！我想说说阿玛兰妲织寿衣的情节，白天织晚上拆，这是怎样的一种自我惩罚啊。', createdAt: now - 44 * hr },
  { id: 'c10', readingId: 'r2', userId: 'u3', userName: '陈星河', content: '刚翻开第一章就被震撼到了，老大哥、电幕、思想警察……这个世界的设定让人不寒而栗。', createdAt: now - 100 * hr },
  { id: 'c11', readingId: 'r2', userId: 'u5', userName: '顾南舟', content: '双重思想这个概念太可怕了，同时持有两种矛盾的信念并都接受，这不就是我们现在常说的"割裂感"吗？', createdAt: now - 80 * hr },
  { id: 'c12', readingId: 'r2', userId: 'u1', userName: '林墨白', content: '奥威尔写这本书的时候是1948年，把年份倒过来就是1984。七十多年过去了，书中的很多预言竟然以不同形式出现了。', createdAt: now - 60 * hr },
  { id: 'c13', readingId: 'r3', userId: 'u2', userName: '苏清欢', content: '今天重读小王子，发现以前只看到了童话，现在看到了人生。', createdAt: now - 200 * hr },
  { id: 'c14', readingId: 'r3', userId: 'u4', userName: '沈听雨', content: '同感。小时候觉得小王子好傻，长大了才知道他是最清醒的人。', createdAt: now - 180 * hr },
  { id: 'c15', readingId: 'r3', userId: 'u5', userName: '顾南舟', content: '"所有的大人都曾经是小孩，虽然，只有少数的人记得。" 这句话应该刻在每本日历上。', createdAt: now - 140 * hr }
];

const mockUserProgress: UserProgress[] = [
  { readingId: 'r1', userId: 'u1', pagesRead: 245, annotationsCount: 12 },
  { readingId: 'r2', userId: 'u1', pagesRead: 115, annotationsCount: 5 },
  { readingId: 'r3', userId: 'u1', pagesRead: 79, annotationsCount: 8 },
  { readingId: 'r5', userId: 'u1', pagesRead: 69, annotationsCount: 3 }
];

const initialState: AppState = {
  currentUser,
  readingPlans: mockReadingPlans,
  annotations: mockAnnotations,
  chatMessages: mockChatMessages,
  userProgress: mockUserProgress
};

function loadFromStorage(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return initialState;
}

function saveToStorage(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function reducer(state: AppState, action: Action): AppState {
  let newState: AppState;
  switch (action.type) {
    case 'ADD_ANNOTATION':
      newState = {
        ...state,
        annotations: [action.payload, ...state.annotations]
      };
      break;
    case 'ADD_CHAT_MESSAGE':
      newState = {
        ...state,
        chatMessages: [...state.chatMessages, action.payload]
      };
      break;
    case 'UPDATE_PROGRESS':
      newState = {
        ...state,
        userProgress: state.userProgress.map(
          p => p.readingId === action.payload.readingId && p.userId === action.payload.userId
            ? action.payload
            : p
        )
      };
      break;
    default:
      return state;
  }
  saveToStorage(newState);
  return newState;
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadFromStorage);

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}

export { mockUsers };
