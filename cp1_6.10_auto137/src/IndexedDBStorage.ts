export type MoodType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'thunder'

export interface Article {
  id?: number
  title: string
  content: string
  mood: MoodType
  rating: number
  createdAt: string
  updatedAt: string
}

const DB_NAME = 'moodBlogDB'
const DB_VERSION = 1
const STORE_NAME = 'articles'

class IndexedDBStorage {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    if (this.db) return
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('mood', 'mood', { unique: false })
          store.createIndex('title', 'title', { unique: false })
        }
      }
    })
  }

  async addArticle(article: Omit<Article, 'id'>): Promise<number> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(article)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as number)
    })
  }

  async getArticles(): Promise<Article[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const articles = request.result as Article[]
        articles.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        resolve(articles)
      }
    })
  }

  async filterArticles(
    keyword?: string,
    mood?: MoodType
  ): Promise<Article[]> {
    const articles = await this.getArticles()
    return articles.filter((article) => {
      const matchKeyword =
        !keyword ||
        article.title.toLowerCase().includes(keyword.toLowerCase()) ||
        article.content.toLowerCase().includes(keyword.toLowerCase())
      const matchMood = !mood || article.mood === mood
      return matchKeyword && matchMood
    })
  }

  async deleteArticle(id: number): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearAll(): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async importArticles(articles: Article[]): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      articles.forEach((article) => {
        const { id, ...rest } = article
        store.add(rest)
      })
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }
}

export const storage = new IndexedDBStorage()
