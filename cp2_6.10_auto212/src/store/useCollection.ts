import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VinylRecord, FavoriteItem, EditionType, StatusType } from '@/数据类型/types'
import { v4 as uuidv4 } from 'uuid'

const generatePlaceholderCover = (index: number): string => {
  const colors = [
    ['#8d6e63', '#d4a373'],
    ['#5d4037', '#a1887f'],
    ['#3d2b1f', '#6d4c41'],
    ['#4e342e', '#8d6e63'],
    ['#3e2723', '#5d4037']
  ]
  const [c1, c2] = colors[index % colors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
    <defs>
      <linearGradient id="g${index}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${c1}"/>
        <stop offset="100%" style="stop-color:${c2}"/>
      </linearGradient>
    </defs>
    <rect width="280" height="280" fill="url(#g${index})"/>
    <circle cx="140" cy="140" r="80" fill="none" stroke="#f5f0e8" stroke-width="2"/>
    <circle cx="140" cy="140" r="60" fill="none" stroke="#f5f0e8" stroke-width="1" opacity="0.5"/>
    <circle cx="140" cy="140" r="40" fill="none" stroke="#f5f0e8" stroke-width="1" opacity="0.3"/>
    <circle cx="140" cy="140" r="8" fill="#f5f0e8"/>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

const mockArtists = [
  'The Beatles', 'Pink Floyd', 'Nirvana', 'Radiohead', 'Bob Dylan',
  'Led Zeppelin', 'David Bowie', 'The Rolling Stones', 'Queen', 'Elvis Presley',
  'Michael Jackson', 'Prince', 'U2', 'The Smiths', 'Joy Division',
  'Fleetwood Mac', 'The Who', 'Oasis', 'Blur', 'Arctic Monkeys',
  'Miles Davis', 'John Coltrane', 'Charles Mingus', 'Herbie Hancock', 'Chet Baker',
  'Ella Fitzgerald', 'Billie Holiday', 'Louis Armstrong', 'Frank Sinatra', 'Nat King Cole'
]

const mockAlbums = [
  'Abbey Road', 'The Dark Side of the Moon', 'Nevermind', 'OK Computer', 'Highway 61 Revisited',
  'Led Zeppelin IV', 'The Rise and Fall of Ziggy Stardust', 'Exile on Main St.', 'A Night at the Opera', 'From Elvis in Memphis',
  'Thriller', 'Purple Rain', 'The Joshua Tree', 'The Queen Is Dead', 'Unknown Pleasures',
  'Rumours', 'Who\'s Next', 'Morning Glory?', 'Parklife', 'Whatever People Say I Am',
  'Kind of Blue', 'A Love Supreme', 'Mingus Ah Um', 'Head Hunters', 'Chet Baker Sings',
  'Ella Fitzgerald Sings the Cole Porter Song Book', 'Lady in Satin', 'What a Wonderful World', 'In the Wee Small Hours', 'Love Is the Thing'
]

const mockStories = [
  '在东京涩谷的一家小店淘到的首版，保存状态极佳，花了整整一个月工资才舍得拿下。',
  '这是爷爷传给我的，他年轻时在上海的爵士酒吧驻场，这张唱片见证了他的青春岁月。',
  '北京798艺术区的唱片集市偶然发现，摊主也是同好，聊了一下午，低价转让给我了。',
  '当年上学时省吃俭用攒了三个月零花钱买的，现在听来依旧感动。',
  '朋友从英国回来带的礼物，据说这张再版在当地已经很难找到了。',
  '在巴黎的跳蚤市场发现的彩胶，颜色非常漂亮，简直是艺术品。'
]

const generateMockRecords = (): VinylRecord[] => {
  const records: VinylRecord[] = []
  const editions: EditionType[] = ['first', 'reprint', 'colored']
  const statuses: StatusType[] = ['for_sale', 'for_trade', 'show_only']

  for (let i = 0; i < 60; i++) {
    const artistIndex = i % mockArtists.length
    records.push({
      id: uuidv4(),
      name: mockAlbums[i % mockAlbums.length],
      artist: mockArtists[artistIndex],
      year: 1960 + (i % 45),
      edition: editions[i % 3],
      status: statuses[i % 3],
      coverImage: generatePlaceholderCover(i),
      sellerPhone: `138${String(10000000 + i * 137).slice(0, 8)}`,
      story: mockStories[i % mockStories.length],
      createdAt: Date.now() - i * 1000
    })
  }
  return records
}

export const useCollectionStore = defineStore('collection', () => {
  const records = ref<VinylRecord[]>(generateMockRecords())
  const favorites = ref<FavoriteItem[]>([])
  const searchKeyword = ref('')
  const highlightedRecordId = ref<string | null>(null)

  const filteredRecords = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) return records.value
    return records.value.filter(r =>
      r.name.toLowerCase().includes(keyword) ||
      r.artist.toLowerCase().includes(keyword)
    )
  })

  const favoriteRecords = computed(() => {
    return favorites.value
      .sort((a, b) => b.favoritedAt - a.favoritedAt)
      .map(fav => records.value.find(r => r.id === fav.recordId))
      .filter((r): r is VinylRecord => r !== undefined)
  })

  const addRecord = (recordData: Omit<VinylRecord, 'id' | 'createdAt'>) => {
    const newRecord: VinylRecord = {
      ...recordData,
      id: uuidv4(),
      createdAt: Date.now()
    }
    records.value.unshift(newRecord)
    return newRecord
  }

  const toggleFavorite = (recordId: string) => {
    const index = favorites.value.findIndex(f => f.recordId === recordId)
    if (index === -1) {
      favorites.value.push({ recordId, favoritedAt: Date.now() })
    } else {
      favorites.value.splice(index, 1)
    }
  }

  const isFavorite = (recordId: string) => {
    return favorites.value.some(f => f.recordId === recordId)
  }

  const setSearchKeyword = (keyword: string) => {
    searchKeyword.value = keyword
  }

  const setHighlightedRecord = (recordId: string | null) => {
    highlightedRecordId.value = recordId
  }

  return {
    records,
    favorites,
    searchKeyword,
    highlightedRecordId,
    filteredRecords,
    favoriteRecords,
    addRecord,
    toggleFavorite,
    isFavorite,
    setSearchKeyword,
    setHighlightedRecord
  }
})
