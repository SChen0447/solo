import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TeaCategory, TeaEntry } from './types/tea'
import { loadEntries, saveEntries } from './utils'
import TeaEntryList from './components/TeaEntryList'
import TeaEntryForm from './components/TeaEntryForm'
import TeaDetail from './components/TeaDetail'
import StatsPanel from './components/StatsPanel'
import FilterBar from './components/FilterBar'

type ViewState =
  | { mode: 'list' }
  | { mode: 'detail'; entry: TeaEntry }
  | { mode: 'form'; initialData: TeaEntry | null }

export default function App() {
  const [entries, setEntries] = useState<TeaEntry[]>([])
  const [view, setView] = useState<ViewState>({ mode: 'list' })
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TeaCategory | 'all'>('all')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadEntries().then((data) => {
      if (!cancelled) {
        setEntries(data)
        setLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loaded) {
      saveEntries(entries)
    }
  }, [entries, loaded])

  const filteredEntries = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    return entries.filter((e) => {
      const matchName = !keyword || e.name.toLowerCase().includes(keyword)
      const matchCategory = selectedCategory === 'all' || e.category === selectedCategory
      return matchName && matchCategory
    })
  }, [entries, searchText, selectedCategory])

  const handleSelectEntry = useCallback((entry: TeaEntry) => {
    setView({ mode: 'detail', entry })
  }, [])

  const handleCreate = useCallback(() => {
    setView({ mode: 'form', initialData: null })
  }, [])

  const handleEditFromDetail = useCallback(() => {
    if (view.mode === 'detail') {
      setView({ mode: 'form', initialData: view.entry })
    }
  }, [view])

  const handleDelete = useCallback(() => {
    if (view.mode !== 'detail') return
    const confirmed = window.confirm(`确定删除「${view.entry.name}」的品鉴记录吗？`)
    if (!confirmed) return
    setEntries((prev) => prev.filter((e) => e.id !== view.entry.id))
    setView({ mode: 'list' })
  }, [view])

  const handleFormSubmit = useCallback((entry: TeaEntry) => {
    setEntries((prev) => {
      const existingIdx = prev.findIndex((e) => e.id === entry.id)
      if (existingIdx >= 0) {
        const next = prev.slice()
        next[existingIdx] = entry
        return next
      }
      return [entry, ...prev]
    })
    setView({ mode: 'list' })
  }, [])

  const handleCloseModal = useCallback(() => {
    setView({ mode: 'list' })
  }, [])

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <div className="app-title">一泡录</div>
          <div className="app-subtitle">茶艺品鉴档案 · 收藏每一缕茶香</div>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <span>＋</span>
          <span>新建记录</span>
        </button>
      </header>

      <FilterBar
        searchText={searchText}
        onSearchChange={setSearchText}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <main className="entry-list">
        <TeaEntryList entries={filteredEntries} onSelect={handleSelectEntry} />
      </main>

      <StatsPanel entries={entries} />

      {view.mode === 'detail' && (
        <TeaDetail
          record={view.entry}
          onClose={handleCloseModal}
          onEdit={handleEditFromDetail}
          onDelete={handleDelete}
        />
      )}

      {view.mode === 'form' && (
        <TeaEntryForm
          initialData={view.initialData}
          onSubmit={handleFormSubmit}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
