import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Book, Category, StockUpdate } from './api'
import { fetchBooks, randomDecreaseStock } from './api'

const READING_LIST_KEY = 'bookstore_reading_list'

function loadReadingList(): number[] {
  try {
    const raw = localStorage.getItem(READING_LIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveReadingList(ids: number[]): void {
  localStorage.setItem(READING_LIST_KEY, JSON.stringify(ids))
}

export const useBookStore = defineStore('books', () => {
  const books = ref<Book[]>([])
  const loading = ref(false)
  const searchKeyword = ref('')
  const activeCategory = ref<Category>('全部')
  const flashingStockIds = ref<Set<number>>(new Set())
  const readingListIds = ref<number[]>(loadReadingList())

  const stockMap = computed(() => {
    const map: Record<number, number> = {}
    books.value.forEach((b) => {
      map[b.id] = b.stock
    })
    return map
  })

  const totalStock = computed(() => {
    return books.value.reduce((sum, b) => sum + b.stock, 0)
  })

  const outOfStockCount = computed(() => {
    return books.value.filter((b) => b.stock === 0).length
  })

  const readingListCount = computed(() => readingListIds.value.length)

  const readingListBooks = computed(() => {
    return readingListIds.value
      .map((id) => books.value.find((b) => b.id === id))
      .filter((b): b is Book => !!b)
  })

  const filteredBooks = computed(() => {
    let result = books.value

    if (activeCategory.value !== '全部') {
      result = result.filter((b) => b.category === activeCategory.value)
    }

    const keyword = searchKeyword.value.trim().toLowerCase()
    if (keyword) {
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(keyword) ||
          b.author.toLowerCase().includes(keyword)
      )
    }

    return result
  })

  async function loadBooks() {
    if (loading.value) return
    loading.value = true
    try {
      const data = await fetchBooks()
      books.value = data
    } finally {
      loading.value = false
    }
  }

  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword
  }

  function setActiveCategory(category: Category) {
    activeCategory.value = category
  }

  function addToReadingList(bookId: number) {
    if (!readingListIds.value.includes(bookId)) {
      readingListIds.value.push(bookId)
      saveReadingList(readingListIds.value)
    }
  }

  function removeFromReadingList(bookId: number) {
    readingListIds.value = readingListIds.value.filter((id) => id !== bookId)
    saveReadingList(readingListIds.value)
  }

  function isInReadingList(bookId: number): boolean {
    return readingListIds.value.includes(bookId)
  }

  function applyStockUpdates(updates: StockUpdate[]) {
    updates.forEach(({ bookId, newStock }) => {
      const book = books.value.find((b) => b.id === bookId)
      if (book) {
        book.stock = newStock
        triggerStockFlash(bookId)
      }
    })
  }

  function triggerStockFlash(bookId: number) {
    flashingStockIds.value.add(bookId)
    setTimeout(() => {
      flashingStockIds.value.delete(bookId)
    }, 300)
  }

  function simulateStockDecrease() {
    const updates = randomDecreaseStock(books.value)
    applyStockUpdates(updates)
  }

  return {
    books,
    loading,
    searchKeyword,
    activeCategory,
    flashingStockIds,
    readingListIds,
    stockMap,
    totalStock,
    outOfStockCount,
    readingListCount,
    readingListBooks,
    filteredBooks,
    loadBooks,
    setSearchKeyword,
    setActiveCategory,
    addToReadingList,
    removeFromReadingList,
    isInReadingList,
    applyStockUpdates,
    simulateStockDecrease
  }
})
