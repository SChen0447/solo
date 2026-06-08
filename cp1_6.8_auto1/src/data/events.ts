import type { GameEvent, NodeType } from '@/types/game'

const monsterEvents: GameEvent[] = [
  {
    id: 'monster_goblin',
    title: '哥布林袭击！',
    description: '一群绿皮哥布林从灌木丛中跳了出来，它们手持生锈的匕首，眼神贪婪地盯着你的行囊...',
    type: 'combat',
    options: [
      {
        id: 'fight',
        text: '拔剑战斗',
        effect: { health: -15, gold: 30, message: '你击败了哥布林，缴获了30金币，但受了些伤。' }
      },
      {
        id: 'flee',
        text: '转身逃跑',
        effect: { health: -5, message: '你狼狈地逃走了，途中被划伤了手臂。' }
      }
    ]
  },
  {
    id: 'monster_wolf',
    title: '饥饿的狼群',
    description: '月光下，几双发光的眼睛缓缓靠近。是狼群！它们低沉的咆哮声让你脊背发凉...',
    type: 'combat',
    options: [
      {
        id: 'fight',
        text: '勇敢迎战',
        effect: { health: -20, gold: 50, message: '经过激烈战斗，你击退了狼群，发现了它们巢穴中的宝藏。' }
      },
      {
        id: 'feed',
        text: '扔出食物分散注意',
        effect: { gold: -10, message: '你用10金币买的肉干引开了狼群，安全脱身。' }
      }
    ]
  },
  {
    id: 'monster_bandit',
    title: '强盗拦路',
    description: '"此山是我开，此树是我栽！" 一个蒙面强盗从树后跳出，挥舞着大刀挡住了去路...',
    type: 'combat',
    options: [
      {
        id: 'fight',
        text: '正面交锋',
        effect: { health: -25, gold: 80, message: '你打败了强盗，从他身上搜出了80金币！' }
      },
      {
        id: 'bribe',
        text: '花钱消灾',
        effect: { gold: -30, message: '你交出30金币，强盗心满意足地让你通过了。' }
      }
    ]
  }
]

const treasureEvents: GameEvent[] = [
  {
    id: 'treasure_chest',
    title: '神秘宝箱',
    description: '一个布满灰尘的古老宝箱静静地躺在角落，上面刻着奇异的符文。它似乎在等待着有人打开...',
    type: 'treasure',
    options: [
      {
        id: 'open',
        text: '打开宝箱',
        effect: { gold: 50, message: '太棒了！宝箱里装着50枚闪亮的金币！' }
      },
      {
        id: 'careful',
        text: '小心检查后再开',
        effect: { gold: 30, health: 5, message: '你小心地解除了陷阱，获得30金币，还找到了一瓶治疗药水。' }
      }
    ]
  },
  {
    id: 'treasure_fountain',
    title: '许愿喷泉',
    description: '一座古老的喷泉散发着微光，水面上漂浮着几枚金币。传说向喷泉许愿会带来好运...',
    type: 'treasure',
    options: [
      {
        id: 'wish_gold',
        text: '投入金币许愿财富',
        effect: { gold: -20, message: '你投入20金币许愿... 什么也没发生。也许只是个传说？' }
      },
      {
        id: 'drink',
        text: '喝下泉水',
        effect: { health: 20, message: '清凉的泉水流入体内，你感到精力充沛，恢复了20点生命！' }
      }
    ]
  },
  {
    id: 'treasure_merchant',
    title: '神秘商人',
    description: '一位身披斗篷的神秘商人出现在你面前，他的背包里似乎装着各种稀奇古怪的东西...',
    type: 'shop',
    options: [
      {
        id: 'buy_potion',
        text: '购买治疗药水 (30金币)',
        effect: { gold: -30, health: 25, message: '你喝下药水，感觉好多了，恢复了25点生命值。' }
      },
      {
        id: 'buy_map',
        text: '购买藏宝图 (50金币)',
        effect: { gold: -50, message: '藏宝图... 好像是假的！你感觉被坑了。' }
      },
      {
        id: 'leave',
        text: '转身离开',
        effect: { message: '你决定不买任何东西，继续上路。' }
      }
    ]
  }
]

const townEvents: GameEvent[] = [
  {
    id: 'town_tavern',
    title: '热闹的酒馆',
    description: '酒馆里人声鼎沸，吟游诗人弹着鲁特琴，冒险者们高谈阔论着各自的传奇故事...',
    type: 'story',
    options: [
      {
        id: 'rest',
        text: '开个房间休息',
        effect: { gold: -15, health: 30, message: '你在温暖的床上睡了一觉，恢复了30点生命值。' }
      },
      {
        id: 'listen',
        text: '听冒险者讲故事',
        effect: { message: '你听了许多有趣的冒险故事，虽然没什么实际收获，但心情变好了。' }
      }
    ]
  },
  {
    id: 'town_market',
    title: '繁华市集',
    description: '市集上人山人海，各种商品琳琅满目。铁匠铺叮当作响，面包店飘来诱人的香气...',
    type: 'shop',
    options: [
      {
        id: 'buy_sword',
        text: '购买新剑 (60金币)',
        effect: { gold: -60, message: '你买了一把锋利的新剑，攻击力提升了！(剧情效果)' }
      },
      {
        id: 'buy_food',
        text: '买些补给 (20金币)',
        effect: { gold: -20, health: 15, message: '你买了些食物和水，路上吃了一些，恢复了15点生命。' }
      },
      {
        id: 'leave',
        text: '随便逛逛就走',
        effect: { message: '你在市集上逛了逛，什么都没买。' }
      }
    ]
  }
]

const forestEvents: GameEvent[] = [
  {
    id: 'forest_hermit',
    title: '森林隐士',
    description: '在森林深处，你发现了一座小木屋。一位白发苍苍的老者正在门前采药...',
    type: 'story',
    options: [
      {
        id: 'greet',
        text: '上前打招呼',
        effect: { health: 15, message: '隐士慈祥地笑了笑，为你敷上了草药，恢复了15点生命。' }
      },
      {
        id: 'sneak',
        text: '悄悄绕过',
        effect: { message: '你小心翼翼地绕过了木屋，没有打扰老人。' }
      }
    ]
  },
  {
    id: 'forest_path',
    title: '分岔路口',
    description: '前方的道路分成了两条，一条通向幽暗的密林深处，另一条似乎绕远但更安全...',
    type: 'story',
    options: [
      {
        id: 'shortcut',
        text: '走近路穿越密林',
        effect: { health: -10, gold: 25, message: '你在密林中被树枝划伤，但意外发现了一个遗落的钱袋，获得25金币。' }
      },
      {
        id: 'safe',
        text: '走远路但更安全',
        effect: { message: '你选择了安全的道路，虽然慢了点，但平安无事。' }
      }
    ]
  }
]

const mountainEvents: GameEvent[] = [
  {
    id: 'mountain_climb',
    title: '险峻山路',
    description: '山路越来越陡峭，你需要手脚并用才能前进。山顶似乎有什么东西在闪光...',
    type: 'story',
    options: [
      {
        id: 'climb',
        text: '继续攀登',
        effect: { health: -15, gold: 70, message: '你艰难地爬上山顶，发现了鹰巢中的宝藏！获得70金币。' }
      },
      {
        id: 'back',
        text: '放弃攀登',
        effect: { message: '你决定不冒险，安全地下山了。' }
      }
    ]
  }
]

const restEvents: GameEvent[] = [
  {
    id: 'rest_inn',
    title: '冒险者旅馆',
    description: '温暖的壁炉、柔软的床铺、还有老板娘热情的招呼... 这里真是旅人的天堂。',
    type: 'rest',
    options: [
      {
        id: 'sleep',
        text: '好好睡一觉',
        effect: { gold: -20, health: 50, message: '你美美地睡了一觉，恢复了50点生命值！' }
      },
      {
        id: 'eat',
        text: '吃顿大餐',
        effect: { gold: -10, health: 20, message: '丰盛的晚餐让你恢复了20点生命值。' }
      }
    ]
  }
]

const bossEvents: GameEvent[] = [
  {
    id: 'boss_demon',
    title: '黑暗魔王！',
    description: '巨大的身影从阴影中浮现，黑暗魔王降临了！它的眼睛燃烧着邪恶的火焰，整个空间都在颤抖...',
    type: 'combat',
    options: [
      {
        id: 'fight_boss',
        text: '拼死一战！',
        effect: { health: -40, gold: 200, message: '经过惨烈的战斗，你击败了黑暗魔王！获得200金币和传说中的勇者称号！' }
      },
      {
        id: 'run_boss',
        text: '战略性撤退',
        effect: { health: -20, message: '你拼命逃跑，但还是被魔王的魔法击中，损失了20点生命。' }
      }
    ]
  }
]

const eventMap: Record<NodeType, GameEvent[]> = {
  start: townEvents,
  town: townEvents,
  monster: monsterEvents,
  treasure: treasureEvents,
  forest: forestEvents,
  mountain: mountainEvents,
  boss: bossEvents,
  rest: restEvents
}

export function getRandomEvent(nodeType: NodeType): GameEvent {
  const events = eventMap[nodeType] || townEvents
  const randomIndex = Math.floor(Math.random() * events.length)
  return events[randomIndex]
}
