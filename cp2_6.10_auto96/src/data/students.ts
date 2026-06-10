export interface Student {
  id: string
  nickname: string
  avatar: string
  color: string
}

const EMOJIS = [
  '😀', '😎', '🤓', '😊', '🥳', '🤩', '😋', '🤗',
  '🐱', '🐶', '🐼', '🦊', '🦁', '🐯', '🐨', '🐸',
  '🌟', '🌈', '🔥', '💎', '🎨', '🎯', '🚀', '⚡'
]

const NICKNAMES = [
  '小明', '小红', '小刚', '小丽', '小华', '小芳',
  '阿杰', '阿敏', '大壮', '小雪', '老王', '阿楠',
  '星辰', '云朵', '海风', '阳光', '彩虹', '流星',
  '晨曦', '暮雪', '青山', '绿水', '翠竹', '红梅'
]

const COLORS = [
  '#6c5ce7', '#a29bfe', '#fd79a8', '#e84393',
  '#00b894', '#55efc4', '#fdcb6e', '#e17055',
  '#0984e3', '#74b9ff', '#d63031', '#fab1a0'
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateStudents(count: number = 24): Student[] {
  const usedEmojis = new Set<string>()
  const usedNicknames = new Set<string>()
  const students: Student[] = []

  for (let i = 0; i < count; i++) {
    let emoji = pickRandom(EMOJIS)
    while (usedEmojis.has(emoji) && usedEmojis.size < EMOJIS.length) {
      emoji = pickRandom(EMOJIS)
    }
    usedEmojis.add(emoji)

    let nickname = pickRandom(NICKNAMES)
    while (usedNicknames.has(nickname) && usedNicknames.size < NICKNAMES.length) {
      nickname = pickRandom(NICKNAMES)
    }
    usedNicknames.add(nickname)
    if (usedNicknames.size >= NICKNAMES.length) {
      nickname = `${nickname}${i + 1}`
    }

    students.push({
      id: `student-${i + 1}`,
      nickname,
      avatar: emoji,
      color: pickRandom(COLORS)
    })
  }

  return students
}

export const students = generateStudents(24)
