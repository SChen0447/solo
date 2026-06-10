import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface BookTag {
  id: string
  name: string
  color: string
}

export interface Book {
  id: string
  title: string
  author: string
  description: string
  cover?: string
  publishYear: number
  progress: number
  tags: string[]
  categoryId: string
}

export interface Category {
  id: string
  name: string
  icon: string
  children?: Category[]
}

const mockTags: BookTag[] = [
  { id: 'tag-1', name: '必读', color: '#e53e3e' },
  { id: 'tag-2', name: '推荐', color: '#d69e2e' },
  { id: 'tag-3', name: '经典', color: '#38a169' },
  { id: 'tag-4', name: '在读', color: '#3182ce' },
  { id: 'tag-5', name: '科幻', color: '#805ad5' },
  { id: 'tag-6', name: '历史', color: '#dd6b20' }
]

const mockCategories: Category[] = [
  {
    id: 'all',
    name: '全部书籍',
    icon: '📚'
  },
  {
    id: 'cat-1',
    name: '文学小说',
    icon: '📖',
    children: [
      { id: 'cat-1-1', name: '古典文学', icon: '🏛️' },
      { id: 'cat-1-2', name: '现代文学', icon: '✒️' },
      { id: 'cat-1-3', name: '外国文学', icon: '🌍' }
    ]
  },
  {
    id: 'cat-2',
    name: '科技计算机',
    icon: '💻',
    children: [
      { id: 'cat-2-1', name: '编程开发', icon: '⌨️' },
      { id: 'cat-2-2', name: '人工智能', icon: '🤖' }
    ]
  },
  {
    id: 'cat-3',
    name: '人文社科',
    icon: '🎓',
    children: [
      { id: 'cat-3-1', name: '历史', icon: '📜' },
      { id: 'cat-3-2', name: '哲学', icon: '🧠' },
      { id: 'cat-3-3', name: '心理学', icon: '❤️' }
    ]
  },
  {
    id: 'cat-4',
    name: '已读完',
    icon: '✅'
  },
  {
    id: 'cat-5',
    name: '想读',
    icon: '⭐'
  }
]

const mockBooks: Book[] = [
  {
    id: 'book-1',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    description: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰，反映了拉丁美洲一个世纪以来风云变幻的历史。',
    cover: '',
    publishYear: 1967,
    progress: 75,
    tags: ['tag-3', 'tag-2'],
    categoryId: 'cat-1-3'
  },
  {
    id: 'book-2',
    title: '深入理解计算机系统',
    author: 'Randal E. Bryant',
    description: '本书从程序员的视角详细阐述计算机系统的本质概念，涵盖计算机底层原理、程序优化、存储器层次结构、链接、加载、虚拟内存、进程控制、信号、并发编程等核心内容。',
    cover: '',
    publishYear: 2016,
    progress: 45,
    tags: ['tag-1', 'tag-4'],
    categoryId: 'cat-2-1'
  },
  {
    id: 'book-3',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    description: '《人类简史》以独特的视角审视人类历史，从认知革命、农业革命到科学革命，讲述智人如何从非洲一个不起眼的族群，登上食物链顶端，成为地球的主宰。',
    cover: '',
    publishYear: 2014,
    progress: 100,
    tags: ['tag-2', 'tag-6'],
    categoryId: 'cat-3-1'
  },
  {
    id: 'book-4',
    title: '三体',
    author: '刘慈欣',
    description: '《三体》是中国科幻文学的里程碑之作。小说讲述了地球文明与三体文明的交流、对抗与融合，展现了宏大的宇宙图景和深刻的哲学思考。',
    cover: '',
    publishYear: 2008,
    progress: 60,
    tags: ['tag-3', 'tag-5', 'tag-4'],
    categoryId: 'cat-1-2'
  },
  {
    id: 'book-5',
    title: '活着',
    author: '余华',
    description: '《活着》讲述了农村人福贵悲惨的人生遭遇。福贵本是个阔少爷，可他嗜赌如命，终于赌光了家业一贫如洗，他的父亲被他活活气死，母亲则在穷困中患了重病。',
    cover: '',
    publishYear: 1993,
    progress: 100,
    tags: ['tag-3', 'tag-1'],
    categoryId: 'cat-1-2'
  },
  {
    id: 'book-6',
    title: '深度学习',
    author: 'Ian Goodfellow',
    description: '《深度学习》是深度学习领域的经典教材，由三位顶尖专家撰写。全书全面介绍深度学习的理论基础、技术方法和应用实践。',
    cover: '',
    publishYear: 2017,
    progress: 20,
    tags: ['tag-1', 'tag-4'],
    categoryId: 'cat-2-2'
  },
  {
    id: 'book-7',
    title: '苏菲的世界',
    author: '乔斯坦·贾德',
    description: '《苏菲的世界》是一本风靡世界的哲学启蒙书。14岁的少女苏菲不断接到一些极不寻常的来信，世界像谜团一般在她眼底展开。',
    cover: '',
    publishYear: 1991,
    progress: 0,
    tags: ['tag-2'],
    categoryId: 'cat-3-2'
  },
  {
    id: 'book-8',
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    description: '在书中，卡尼曼会带领我们体验一次思维的终极之旅。他认为，我们的大脑有快与慢两种作决定的方式。',
    cover: '',
    publishYear: 2011,
    progress: 35,
    tags: ['tag-4', 'tag-2'],
    categoryId: 'cat-3-3'
  },
  {
    id: 'book-9',
    title: '红楼梦',
    author: '曹雪芹',
    description: '《红楼梦》是中国古典四大名著之首，以贾宝玉、林黛玉、薛宝钗的爱情婚姻悲剧为主线，以贾、史、王、薛四大家族的兴衰为背景。',
    cover: '',
    publishYear: 1791,
    progress: 50,
    tags: ['tag-3', 'tag-1'],
    categoryId: 'cat-1-1'
  },
  {
    id: 'book-10',
    title: 'Vue.js设计与实现',
    author: '霍春阳',
    description: '本书基于Vue 3，从核心原理出发，带你深入浅出地理解Vue.js的设计思路及其各个功能模块的实现原理。',
    cover: '',
    publishYear: 2022,
    progress: 85,
    tags: ['tag-1', 'tag-4'],
    categoryId: 'cat-2-1'
  },
  {
    id: 'book-11',
    title: '万历十五年',
    author: '黄仁宇',
    description: '《万历十五年》是历史学家黄仁宇的代表作，作者用近乎平淡的笔触分析一个皇朝从兴盛走向衰颓的原因。',
    cover: '',
    publishYear: 1982,
    progress: 0,
    tags: ['tag-6'],
    categoryId: 'cat-3-1'
  },
  {
    id: 'book-12',
    title: '基地',
    author: '艾萨克·阿西莫夫',
    description: '《基地》是阿西莫夫的科幻代表作，讲述了银河帝国衰落之际，心理史学的创始人哈里·谢顿为人类文明的延续制定的宏大计划。',
    cover: '',
    publishYear: 1951,
    progress: 0,
    tags: ['tag-5', 'tag-3'],
    categoryId: 'cat-1-3'
  }
]

export const useBookStore = defineStore('book', () => {
  const books = ref<Book[]>(mockBooks)
  const tags = ref<BookTag[]>(mockTags)
  const categories = ref<Category[]>(mockCategories)
  const selectedCategoryId = ref<string>('all')
  const searchQuery = ref<string>('')

  const allCategoryIds = computed(() => {
    const ids: string[] = []
    const traverse = (cats: Category[]) => {
      cats.forEach(cat => {
        ids.push(cat.id)
        if (cat.children) traverse(cat.children)
      })
    }
    traverse(categories.value)
    return ids
  })

  const getChildCategoryIds = (parentId: string): string[] => {
    const ids: string[] = [parentId]
    const findAndCollect = (cats: Category[]) => {
      for (const cat of cats) {
        if (cat.id === parentId && cat.children) {
          cat.children.forEach(child => {
            ids.push(child.id)
            if ((child as Category).children) {
              ids.push(...getChildCategoryIds(child.id))
            }
          })
          return true
        }
        if (cat.children && findAndCollect(cat.children)) return true
      }
      return false
    }
    findAndCollect(categories.value)
    return ids
  }

  const filteredBooks = computed(() => {
    let result = books.value

    if (selectedCategoryId.value && selectedCategoryId.value !== 'all') {
      const categoryIds = getChildCategoryIds(selectedCategoryId.value)
      if (selectedCategoryId.value === 'cat-4') {
        result = result.filter(b => b.progress === 100)
      } else if (selectedCategoryId.value === 'cat-5') {
        result = result.filter(b => b.progress === 0)
      } else {
        result = result.filter(b => categoryIds.includes(b.categoryId))
      }
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      result = result.filter(book => {
        const matchTitle = book.title.toLowerCase().includes(query)
        const matchAuthor = book.author.toLowerCase().includes(query)
        const matchTag = book.tags.some(tagId => {
          const tag = tags.value.find(t => t.id === tagId)
          return tag?.name.toLowerCase().includes(query)
        })
        return matchTitle || matchAuthor || matchTag
      })
    }

    return result
  })

  const searchResultCount = computed(() => filteredBooks.value.length)

  const getTagById = (tagId: string) => tags.value.find(t => t.id === tagId)

  const getCategoryById = (id: string): Category | null => {
    const find = (cats: Category[]): Category | null => {
      for (const cat of cats) {
        if (cat.id === id) return cat
        if (cat.children) {
          const found = find(cat.children)
          if (found) return found
        }
      }
      return null
    }
    return find(categories.value)
  }

  const getBookById = (id: string) => books.value.find(b => b.id === id)

  const updateProgress = (bookId: string, progress: number) => {
    const book = books.value.find(b => b.id === bookId)
    if (book) {
      book.progress = Math.max(0, Math.min(100, Math.round(progress)))
    }
  }

  const addTagToBook = (bookId: string, tagId: string) => {
    const book = books.value.find(b => b.id === bookId)
    if (book && !book.tags.includes(tagId)) {
      book.tags.push(tagId)
    }
  }

  const removeTagFromBook = (bookId: string, tagId: string) => {
    const book = books.value.find(b => b.id === bookId)
    if (book) {
      book.tags = book.tags.filter(t => t !== tagId)
    }
  }

  const createTag = (name: string, color: string): BookTag => {
    const newTag: BookTag = {
      id: `tag-${Date.now()}`,
      name,
      color
    }
    tags.value.push(newTag)
    return newTag
  }

  const setCategory = (categoryId: string) => {
    selectedCategoryId.value = categoryId
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  return {
    books,
    tags,
    categories,
    selectedCategoryId,
    searchQuery,
    filteredBooks,
    searchResultCount,
    allCategoryIds,
    getTagById,
    getCategoryById,
    getBookById,
    getChildCategoryIds,
    updateProgress,
    addTagToBook,
    removeTagFromBook,
    createTag,
    setCategory,
    setSearchQuery
  }
})
