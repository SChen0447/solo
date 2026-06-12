import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Feedback, FeedbackFilters, ViewMode, UrgencyLevel, FeedbackStatus, Statistics } from '@/types/feedback'
import { mockApi } from '@/mock/feedbackMock'

export const useFeedbackStore = defineStore('feedback', () => {
  const feedbacks = ref<Feedback[]>([])
  const filters = ref<FeedbackFilters>({
    searchKeyword: '',
    urgency: 'all',
    status: 'all'
  })
  const viewMode = ref<ViewMode>('kanban')
  const selectedFeedback = ref<Feedback | null>(null)
  const isLoading = ref(false)

  const filteredFeedbacks = computed(() => {
    let result = [...feedbacks.value]

    if (filters.value.searchKeyword) {
      const keyword = filters.value.searchKeyword.toLowerCase()
      result = result.filter(f =>
        f.title.toLowerCase().includes(keyword) ||
        f.description.toLowerCase().includes(keyword) ||
        f.source.toLowerCase().includes(keyword)
      )
    }

    if (filters.value.urgency !== 'all') {
      result = result.filter(f => f.urgency === filters.value.urgency)
    }

    if (filters.value.status !== 'all') {
      result = result.filter(f => f.status === filters.value.status)
    }

    return result
  })

  const sortedFeedbacks = computed(() => {
    return [...filteredFeedbacks.value].sort((a, b) => b.createdAt - a.createdAt)
  })

  const feedbacksByUrgency = computed(() => {
    const normal: Feedback[] = []
    const urgent: Feedback[] = []
    const critical: Feedback[] = []

    sortedFeedbacks.value.forEach(f => {
      const sorted = [...filteredFeedbacks.value]
        .filter(ff => ff.urgency === f.urgency)
        .sort((a, b) => a.order - b.order)
      if (f.urgency === 'normal' && !normal.find(n => n.id === f.id)) {
        normal.push(...sorted.filter(sf => sf.urgency === 'normal'))
      } else if (f.urgency === 'urgent' && !urgent.find(u => u.id === f.id)) {
        urgent.push(...sorted.filter(sf => sf.urgency === 'urgent'))
      } else if (f.urgency === 'critical' && !critical.find(c => c.id === f.id)) {
        critical.push(...sorted.filter(sf => sf.urgency === 'critical'))
      }
    })

    return {
      normal: [...new Map(normal.map(item => [item.id, item])).values()].sort((a, b) => a.order - b.order),
      urgent: [...new Map(urgent.map(item => [item.id, item])).values()].sort((a, b) => a.order - b.order),
      critical: [...new Map(critical.map(item => [item.id, item])).values()].sort((a, b) => a.order - b.order)
    }
  })

  const statistics = computed<Statistics>(() => {
    const now = Date.now()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayTimestamp = todayStart.getTime()

    const todayCount = feedbacks.value.filter(f => f.createdAt >= todayTimestamp).length
    const pendingCount = feedbacks.value.filter(f => f.status === 'pending').length

    const resolvedFeedbacks = feedbacks.value.filter(f => f.status === 'resolved')
    let avgResponseTime = 0
    if (resolvedFeedbacks.length > 0) {
      const totalTime = resolvedFeedbacks.reduce((sum, f) => {
        return sum + (f.updatedAt - f.createdAt)
      }, 0)
      avgResponseTime = Math.round(totalTime / resolvedFeedbacks.length / (1000 * 60))
    }

    return {
      todayCount,
      pendingCount,
      avgResponseTime
    }
  })

  async function loadFeedbacks() {
    isLoading.value = true
    try {
      feedbacks.value = await mockApi.getFeedbacks()
    } finally {
      isLoading.value = false
    }
  }

  async function addFeedback(data: {
    title: string
    source: string
    description: string
    urgency: UrgencyLevel
  }) {
    const newFeedback = await mockApi.addFeedback(data)
    feedbacks.value.unshift(newFeedback)
    return newFeedback
  }

  async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
    const updated = await mockApi.updateFeedbackStatus(id, status)
    const index = feedbacks.value.findIndex(f => f.id === id)
    if (index !== -1) {
      feedbacks.value[index] = updated
    }
    if (selectedFeedback.value?.id === id) {
      selectedFeedback.value = updated
    }
  }

  async function updateOrder(urgency: UrgencyLevel, ids: string[]) {
    const allIds = feedbacks.value.map(f => f.id)
    const otherIds = allIds.filter(id => !ids.includes(id))
    await mockApi.updateOrder([...ids, ...otherIds])

    ids.forEach((id, index) => {
      const feedback = feedbacks.value.find(f => f.id === id)
      if (feedback) {
        feedback.order = index
      }
    })
  }

  function setFilters(newFilters: Partial<FeedbackFilters>) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function selectFeedback(feedback: Feedback | null) {
    selectedFeedback.value = feedback
  }

  function isHighlighted(feedback: Feedback): boolean {
    if (!filters.value.searchKeyword) return false
    const keyword = filters.value.searchKeyword.toLowerCase()
    return (
      feedback.title.toLowerCase().includes(keyword) ||
      feedback.description.toLowerCase().includes(keyword) ||
      feedback.source.toLowerCase().includes(keyword)
    )
  }

  return {
    feedbacks,
    filters,
    viewMode,
    selectedFeedback,
    isLoading,
    filteredFeedbacks,
    sortedFeedbacks,
    feedbacksByUrgency,
    statistics,
    loadFeedbacks,
    addFeedback,
    updateFeedbackStatus,
    updateOrder,
    setFilters,
    setViewMode,
    selectFeedback,
    isHighlighted
  }
})
