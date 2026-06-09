import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Movie, FilterState, SortKey } from '@/types'

const STORAGE_KEY = 'movie-collection-data'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function loadFromStorage(): Movie[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const useMovieStore = defineStore('movie', () => {
  const movies = ref<Movie[]>(loadFromStorage())

  const filter = ref<FilterState>({
    ratingMin: 1,
    ratingMax: 10,
    tags: [],
    yearMin: null,
    yearMax: null,
    sortKey: 'watchDateDesc'
  })

  const allTags = computed(() => {
    const tagSet = new Set<string>()
    movies.value.forEach((m) => m.tags.forEach((t) => tagSet.add(t))
    return Array.from(tagSet).sort()
  })

  const filteredMovies = computed(() => {
    let result = [...movies.value]

    result = result.filter((m) => {
      if (m.rating < filter.value.ratingMin || m.rating > filter.value.ratingMax) {
        return false
      }
      if (filter.value.tags.length > 0 && !filter.value.tags.every((t) => m.tags.includes(t))) {
        return false
      }
      if (filter.value.yearMin !== null && m.year < filter.value.yearMin) {
        return false
      }
      if (filter.value.yearMax !== null && m.year > filter.value.yearMax) {
        return false
      }
      return true
    })

    switch (filter.value.sortKey) {
      case 'ratingDesc':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'yearAsc':
        result.sort((a, b) => a.year - b.year)
        break
      case 'watchDateDesc':
      default:
        result.sort((a, b) => new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime())
    }

    return result
  })

  const totalCount = computed(() => movies.value.length)

  const avgRating = computed(() => {
    if (movies.value.length === 0) return 0
    const sum = movies.value.reduce((acc, m) => acc + m.rating, 0)
    return Number((sum / movies.value.length).toFixed(1))
  })

  const favoriteTag = computed(() => {
    const counter: Record<string, number> = {}
    movies.value.forEach((m) => {
      m.tags.forEach((t) => {
        counter[t] = (counter[t] || 0) + 1
      })
    })
    let max = 0
    let fav = ''
    Object.entries(counter).forEach(([tag, count]) => {
      if (count > max) {
        max = count
        fav = tag
      }
    })
    return fav
  })

  function addMovie(data: Omit<Movie, 'id' | 'createdAt'>) {
    const movie: Movie = {
      ...data,
      id: generateId(),
      createdAt: Date.now()
    }
    movies.value.push(movie)
  }

  function updateMovie(id: string, data: Partial<Omit<Movie, 'id' | 'createdAt'>>) {
    const index = movies.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      movies.value[index] = { ...movies.value[index], ...data }
    }
  }

  function deleteMovie(id: string) {
    const index = movies.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      movies.value.splice(index, 1)
    }
  }

  function setSort(key: SortKey) {
    filter.value.sortKey = key
  }

  function setRatingRange(min: number, max: number) {
    filter.value.ratingMin = min
    filter.value.ratingMax = max
  }

  function toggleFilterTag(tag: string) {
    const idx = filter.value.tags.indexOf(tag)
    if (idx === -1) {
      filter.value.tags.push(tag)
    } else {
      filter.value.tags.splice(idx, 1)
    }
  }

  function clearFilterTags() {
    filter.value.tags = []
  }

  function setYearRange(min: number | null, max: number | null) {
    filter.value.yearMin = min
    filter.value.yearMax = max
  }

  function resetFilter() {
    filter.value = {
      ratingMin: 1,
      ratingMax: 10,
      tags: [],
      yearMin: null,
      yearMax: null,
      sortKey: 'watchDateDesc'
    }
  }

  function exportCSV(): string {
    const rows = [['标题', '评分', '标签']]
    filteredMovies.value.forEach((m) => {
      rows.push([m.title, m.rating.toString(), m.tags.join(' / ')])
    })
    return rows
      .map((row) =>
        row.map((cell) => {
          const escaped = cell.replace(/"/g, '""')
          return `"${escaped}"`
        }).join(',')
      )
      .join('\n')
  }

  function downloadCSV() {
    const csv = exportCSV()
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `我的看单_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  watch(
    movies,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    },
    { deep: true }
  )

  return {
    movies,
    filter,
    allTags,
    filteredMovies,
    totalCount,
    avgRating,
    favoriteTag,
    addMovie,
    updateMovie,
    deleteMovie,
    setSort,
    setRatingRange,
    toggleFilterTag,
    clearFilterTags,
    setYearRange,
    resetFilter,
    downloadCSV
  }
})
