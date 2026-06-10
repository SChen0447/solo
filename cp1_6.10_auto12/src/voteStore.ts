import { useState, useEffect, useCallback, useRef } from 'react'

export interface VoteOption {
  id: string
  emoji: string
  text: string
  votes: number
}

export interface VoteRecord {
  nickname: string
  roomCode: string
  optionId: string
  timestamp: number
  voteDuration: number
}

export interface VoteTopic {
  id: string
  title: string
  options: VoteOption[]
  roomCode: string
  createdAt: number
  endAt: number | null
  isActive: boolean
  records: VoteRecord[]
}

type Listener = (topics: VoteTopic[]) => void

const generateId = () => Math.random().toString(36).substring(2, 10)
const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

class MockWebSocketService {
  private topics: Map<string, VoteTopic> = new Map()
  private listeners: Set<Listener> = new Set()
  private broadcastTimer: number | null = null

  constructor() {
    this.initMockData()
    this.startBroadcast()
  }

  private initMockData() {
    const mockTopics: VoteTopic[] = [
      {
        id: generateId(),
        title: '本周团建活动选择',
        options: [
          { id: generateId(), emoji: '🎮', text: '密室逃脱', votes: 5 },
          { id: generateId(), emoji: '🍽️', text: '聚餐K歌', votes: 8 },
          { id: generateId(), emoji: '🏞️', text: '户外徒步', votes: 3 },
          { id: generateId(), emoji: '🎬', text: '观影派对', votes: 6 },
        ],
        roomCode: 'TEAM01',
        createdAt: Date.now() - 3600000,
        endAt: null,
        isActive: true,
        records: [],
      },
      {
        id: generateId(),
        title: '新项目技术栈选型',
        options: [
          { id: generateId(), emoji: '⚛️', text: 'React + TypeScript', votes: 12 },
          { id: generateId(), emoji: '💚', text: 'Vue 3 + Vite', votes: 9 },
          { id: generateId(), emoji: '🅰️', text: 'Angular', votes: 2 },
          { id: generateId(), emoji: '🦀', text: 'Next.js', votes: 7 },
          { id: generateId(), emoji: '⚡', text: 'Svelte', votes: 4 },
        ],
        roomCode: 'TECH01',
        createdAt: Date.now() - 7200000,
        endAt: null,
        isActive: true,
        records: [],
      },
      {
        id: generateId(),
        title: '午餐吃什么？',
        options: [
          { id: generateId(), emoji: '🍜', text: '日式拉面', votes: 15 },
          { id: generateId(), emoji: '🍕', text: '意式披萨', votes: 10 },
          { id: generateId(), emoji: '🥡', text: '中式便当', votes: 18 },
          { id: generateId(), emoji: '🌮', text: '墨西哥卷', votes: 7 },
          { id: generateId(), emoji: '🍣', text: '寿司套餐', votes: 11 },
          { id: generateId(), emoji: '🥗', text: '轻食沙拉', votes: 5 },
        ],
        roomCode: 'LUNCH',
        createdAt: Date.now() - 1800000,
        endAt: null,
        isActive: true,
        records: [],
      },
    ]
    mockTopics.forEach(t => this.topics.set(t.id, t))
  }

  private startBroadcast() {
    this.broadcastTimer = window.setInterval(() => {
      this.broadcast()
    }, 100)
  }

  private broadcast() {
    const topics = this.getAllTopics()
    this.listeners.forEach(listener => listener(topics))
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.getAllTopics())
    return () => this.listeners.delete(listener)
  }

  getAllTopics(): VoteTopic[] {
    return Array.from(this.topics.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  getTopic(id: string): VoteTopic | undefined {
    return this.topics.get(id)
  }

  getTopicByRoomCode(roomCode: string): VoteTopic | undefined {
    return Array.from(this.topics.values()).find(t => t.roomCode === roomCode.toUpperCase())
  }

  createTopic(title: string, options: { emoji: string; text: string }[]): VoteTopic {
    const id = generateId()
    const topic: VoteTopic = {
      id,
      title: title.slice(0, 50),
      options: options.map(o => ({
        id: generateId(),
        emoji: o.emoji,
        text: o.text,
        votes: 0,
      })),
      roomCode: generateRoomCode(),
      createdAt: Date.now(),
      endAt: null,
      isActive: true,
      records: [],
    }
    this.topics.set(id, topic)
    this.broadcast()
    return topic
  }

  castVote(
    topicId: string,
    optionId: string,
    nickname: string,
    roomCode: string,
    voteDuration: number
  ): { success: boolean; message: string } {
    const topic = this.topics.get(topicId)
    if (!topic) return { success: false, message: '投票主题不存在' }
    if (!topic.isActive) return { success: false, message: '投票已结束' }
    if (topic.roomCode !== roomCode.toUpperCase()) return { success: false, message: '房间码不正确' }

    const hasVoted = topic.records.some(r => r.nickname === nickname && r.roomCode === roomCode.toUpperCase())
    if (hasVoted) return { success: false, message: '您已经投过票了' }

    const option = topic.options.find(o => o.id === optionId)
    if (!option) return { success: false, message: '选项不存在' }

    option.votes += 1
    topic.records.push({
      nickname,
      roomCode: roomCode.toUpperCase(),
      optionId,
      timestamp: Date.now(),
      voteDuration,
    })

    this.broadcast()
    return { success: true, message: '投票成功' }
  }

  hasUserVoted(topicId: string, nickname: string, roomCode: string): boolean {
    const topic = this.topics.get(topicId)
    if (!topic) return false
    return topic.records.some(r => r.nickname === nickname && r.roomCode === roomCode.toUpperCase())
  }

  getUserVoteOption(topicId: string, nickname: string, roomCode: string): string | null {
    const topic = this.topics.get(topicId)
    if (!topic) return null
    const record = topic.records.find(r => r.nickname === nickname && r.roomCode === roomCode.toUpperCase())
    return record ? record.optionId : null
  }

  resetVotes(topicId: string): boolean {
    const topic = this.topics.get(topicId)
    if (!topic) return false
    topic.options.forEach(o => (o.votes = 0))
    topic.records = []
    topic.isActive = true
    topic.endAt = null
    this.broadcast()
    return true
  }

  endVote(topicId: string): boolean {
    const topic = this.topics.get(topicId)
    if (!topic) return false
    topic.isActive = false
    topic.endAt = Date.now()
    this.broadcast()
    return true
  }
}

const wsService = new MockWebSocketService()

export function useVoteStore() {
  const [topics, setTopics] = useState<VoteTopic[]>([])
  const isFirstLoad = useRef(true)

  useEffect(() => {
    const unsubscribe = wsService.subscribe(newTopics => {
      setTopics([...newTopics])
    })
    return unsubscribe
  }, [])

  const createTopic = useCallback((title: string, options: { emoji: string; text: string }[]) => {
    return wsService.createTopic(title, options)
  }, [])

  const castVote = useCallback(
    (topicId: string, optionId: string, nickname: string, roomCode: string, voteDuration: number) => {
      return wsService.castVote(topicId, optionId, nickname, roomCode, voteDuration)
    },
    []
  )

  const hasUserVoted = useCallback((topicId: string, nickname: string, roomCode: string) => {
    return wsService.hasUserVoted(topicId, nickname, roomCode)
  }, [])

  const getUserVoteOption = useCallback((topicId: string, nickname: string, roomCode: string) => {
    return wsService.getUserVoteOption(topicId, nickname, roomCode)
  }, [])

  const resetVotes = useCallback((topicId: string) => {
    return wsService.resetVotes(topicId)
  }, [])

  const endVote = useCallback((topicId: string) => {
    return wsService.endVote(topicId)
  }, [])

  const getTopicByRoomCode = useCallback((roomCode: string) => {
    return wsService.getTopicByRoomCode(roomCode)
  }, [])

  return {
    topics,
    createTopic,
    castVote,
    hasUserVoted,
    getUserVoteOption,
    resetVotes,
    endVote,
    getTopicByRoomCode,
    isFirstLoad: isFirstLoad.current,
  }
}

export function calculateStats(topic: VoteTopic) {
  const totalVotes = topic.options.reduce((sum, o) => sum + o.votes, 0)
  const sortedOptions = [...topic.options].sort((a, b) => b.votes - a.votes)
  const rankings = sortedOptions.map((o, idx) => ({ ...o, rank: idx + 1 }))

  const avgDuration =
    topic.records.length > 0
      ? topic.records.reduce((sum, r) => sum + r.voteDuration, 0) / topic.records.length
      : 0

  const voteCounts = topic.options.map(o => o.votes)
  const mean = voteCounts.length > 0 ? voteCounts.reduce((a, b) => a + b, 0) / voteCounts.length : 0
  const variance =
    voteCounts.length > 0
      ? voteCounts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / voteCounts.length
      : 0
  const stdDev = Math.sqrt(variance)

  return {
    totalVotes,
    rankings,
    avgDuration: avgDuration.toFixed(1),
    stdDev: stdDev.toFixed(2),
  }
}
