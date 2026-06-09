export interface Book {
  id: number
  title: string
  author: string
  category: '小说' | '非虚构' | '科幻' | '历史' | '艺术'
  cover: string
  stock: number
}

export type Category = Book['category'] | '全部'

export interface StockUpdate {
  bookId: number
  oldStock: number
  newStock: number
}

const mockBooks: Book[] = [
  { id: 1, title: '百年孤独', author: '加西亚·马尔克斯', category: '小说', cover: '📘', stock: 15 },
  { id: 2, title: '活着', author: '余华', category: '小说', cover: '📕', stock: 8 },
  { id: 3, title: '三体', author: '刘慈欣', category: '科幻', cover: '🚀', stock: 12 },
  { id: 4, title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', cover: '🌍', stock: 5 },
  { id: 5, title: '艺术的故事', author: '贡布里希', category: '艺术', cover: '🎨', stock: 3 },
  { id: 6, title: '乡土中国', author: '费孝通', category: '非虚构', cover: '📖', stock: 10 },
  { id: 7, title: '沙丘', author: '弗兰克·赫伯特', category: '科幻', cover: '🏜️', stock: 0 },
  { id: 8, title: '明朝那些事儿', author: '当年明月', category: '历史', cover: '📜', stock: 18 },
  { id: 9, title: '追风筝的人', author: '卡勒德·胡赛尼', category: '小说', cover: '🪁', stock: 7 },
  { id: 10, title: '思考，快与慢', author: '丹尼尔·卡尼曼', category: '非虚构', cover: '🧠', stock: 6 },
  { id: 11, title: '梵高手稿', author: '文森特·梵高', category: '艺术', cover: '🌻', stock: 2 },
  { id: 12, title: '基地', author: '艾萨克·阿西莫夫', category: '科幻', cover: '🌌', stock: 9 },
  { id: 13, title: '平凡的世界', author: '路遥', category: '小说', cover: '🌾', stock: 0 },
  { id: 14, title: '万历十五年', author: '黄仁宇', category: '历史', cover: '🏯', stock: 11 },
  { id: 15, title: '置身事内', author: '兰小欢', category: '非虚构', cover: '🏛️', stock: 14 },
  { id: 16, title: '西方哲学史', author: '伯特兰·罗素', category: '非虚构', cover: '🤔', stock: 4 },
  { id: 17, title: '艺术博物馆', author: '英国费顿出版社', category: '艺术', cover: '🖼️', stock: 1 },
  { id: 18, title: '球状闪电', author: '刘慈欣', category: '科幻', cover: '⚡', stock: 20 }
]

function delay<T>(data: T, ms = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

export function fetchBooks(): Promise<Book[]> {
  return delay([...mockBooks])
}

export function fetchStock(): Promise<Record<number, number>> {
  const stockMap: Record<number, number> = {}
  mockBooks.forEach((book) => {
    stockMap[book.id] = book.stock
  })
  return delay(stockMap)
}

export function getCategories(): Category[] {
  return ['全部', '小说', '非虚构', '科幻', '历史', '艺术']
}

export function randomDecreaseStock(books: Book[]): StockUpdate[] {
  const updates: StockUpdate[] = []
  const count = Math.floor(Math.random() * 3) + 1
  const availableBooks = books.filter((b) => b.stock > 0)

  for (let i = 0; i < count && availableBooks.length > 0; i++) {
    const idx = Math.floor(Math.random() * availableBooks.length)
    const book = availableBooks[idx]
    const decrease = Math.floor(Math.random() * 3) + 1
    const newStock = Math.max(0, book.stock - decrease)

    if (newStock !== book.stock) {
      updates.push({
        bookId: book.id,
        oldStock: book.stock,
        newStock
      })
      book.stock = newStock
    }
    availableBooks.splice(idx, 1)
  }

  return updates
}
