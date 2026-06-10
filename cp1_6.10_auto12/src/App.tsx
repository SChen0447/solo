import { useState, useEffect, useMemo, useRef } from 'react'
import { useVoteStore, calculateStats } from './voteStore'
import VoteCard from './components/VoteCard'
import ResultChart from './components/ResultChart'

type View = 'dashboard' | 'create' | 'detail'
type SortType = 'time' | 'hot'

const EMOJI_OPTIONS = ['👍', '🎉', '🚀', '💡', '🔥', '⭐', '✅', '❤️', '🎯', '🏆', '📊', '🎨']

interface OptionInput {
  emoji: string
  text: string
}

export default function App() {
  const { topics, createTopic, castVote, hasUserVoted, getUserVoteOption, resetVotes, endVote, getTopicByRoomCode } =
    useVoteStore()

  const [view, setView] = useState<View>('dashboard')
  const [sortType, setSortType] = useState<SortType>('time')
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinRoomCode, setJoinRoomCode] = useState('')
  const [joinNickname, setJoinNickname] = useState('')

  const [newTitle, setNewTitle] = useState('')
  const [newOptions, setNewOptions] = useState<OptionInput[]>([
    { emoji: '👍', text: '' },
    { emoji: '🎉', text: '' },
    { emoji: '🚀', text: '' },
    { emoji: '💡', text: '' },
  ])

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [voteStartTime, setVoteStartTime] = useState<number | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [particleKey, setParticleKey] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [contentVisible, setContentVisible] = useState(true)
  const [resetPressed, setResetPressed] = useState(false)
  const [createPressed, setCreatePressed] = useState(false)
  const [backPressed, setBackPressed] = useState(false)

  const sortedTopics = useMemo(() => {
    const sorted = [...topics]
    if (sortType === 'hot') {
      sorted.sort((a, b) => {
        const votesA = a.options.reduce((s, o) => s + o.votes, 0)
        const votesB = b.options.reduce((s, o) => s + o.votes, 0)
        return votesB - votesA
      })
    } else {
      sorted.sort((a, b) => b.createdAt - a.createdAt)
    }
    return sorted
  }, [topics, sortType])

  const currentTopic = topics.find(t => t.id === selectedTopicId) || null
  const userHasVoted = currentTopic ? hasUserVoted(currentTopic.id, nickname, roomCode) : false
  const userVotedOptionId = currentTopic ? getUserVoteOption(currentTopic.id, nickname, roomCode) : null

  const switchView = (newView: View, topicId: string | null = null) => {
    setContentVisible(false)
    setTransitioning(true)
    setTimeout(() => {
      setView(newView)
      setSelectedTopicId(topicId)
      setSelectedOptionId(null)
      setSubmitSuccess(false)
      setJoinError('')
      if (newView === 'detail') {
        setVoteStartTime(Date.now())
      }
      setTimeout(() => {
        setContentVisible(true)
        setTransitioning(false)
      }, 300)
    }, 200)
  }

  const handleCreateTopic = () => {
    setCreatePressed(true)
    setTimeout(() => setCreatePressed(false), 150)

    if (!newTitle.trim()) {
      setSubmitMessage('请输入投票主题')
      setSubmitSuccess(false)
      return
    }
    const validOptions = newOptions.filter(o => o.text.trim())
    if (validOptions.length < 4) {
      setSubmitMessage('至少需要4个有效选项')
      setSubmitSuccess(false)
      return
    }
    if (validOptions.length > 6) {
      setSubmitMessage('最多只能有6个选项')
      setSubmitSuccess(false)
      return
    }

    const topic = createTopic(newTitle.trim(), validOptions)
    setNewTitle('')
    setNewOptions([
      { emoji: '👍', text: '' },
      { emoji: '🎉', text: '' },
      { emoji: '🚀', text: '' },
      { emoji: '💡', text: '' },
    ])
    setSubmitMessage(`创建成功！房间码: ${topic.roomCode}`)
    setSubmitSuccess(true)
    setTimeout(() => {
      switchView('detail', topic.id)
    }, 1000)
  }

  const handleJoinRoom = () => {
    if (!joinNickname.trim()) {
      setJoinError('请输入昵称')
      return
    }
    if (!joinRoomCode.trim()) {
      setJoinError('请输入房间码')
      return
    }
    const topic = getTopicByRoomCode(joinRoomCode.trim())
    if (!topic) {
      setJoinError('房间码不存在')
      return
    }
    setNickname(joinNickname.trim())
    setRoomCode(joinRoomCode.trim().toUpperCase())
    setJoinError('')
    switchView('detail', topic.id)
  }

  const handleSubmitVote = () => {
    if (!currentTopic || !selectedOptionId) return
    const duration = voteStartTime ? (Date.now() - voteStartTime) / 1000 : 5
    const result = castVote(currentTopic.id, selectedOptionId, nickname, roomCode, duration)
    setSubmitMessage(result.message)
    setSubmitSuccess(result.success)
    if (result.success) {
      setParticleKey(k => k + 1)
    }
  }

  const handleResetVotes = () => {
    if (!currentTopic) return
    setResetPressed(true)
    setTimeout(() => setResetPressed(false), 150)
    resetVotes(currentTopic.id)
    setSelectedOptionId(null)
    setVoteStartTime(Date.now())
    setSubmitMessage('投票已重置')
    setSubmitSuccess(true)
    setParticleKey(k => k + 1)
  }

  const addOption = () => {
    if (newOptions.length >= 6) return
    setNewOptions([...newOptions, { emoji: EMOJI_OPTIONS[newOptions.length % EMOJI_OPTIONS.length], text: '' }])
  }

  const removeOption = (idx: number) => {
    if (newOptions.length <= 4) return
    setNewOptions(newOptions.filter((_, i) => i !== idx))
  }

  const updateOption = (idx: number, field: 'emoji' | 'text', value: string) => {
    const updated = [...newOptions]
    updated[idx][field] = value
    setNewOptions(updated)
  }

  useEffect(() => {
    if (view === 'dashboard') {
      setNickname('')
      setRoomCode('')
      setJoinNickname('')
      setJoinRoomCode('')
    }
  }, [view])

  const currentStats = currentTopic ? calculateStats(currentTopic) : null

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F5F7FA' }}
    >
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setBackPressed(true)
              setTimeout(() => setBackPressed(false), 150)
              switchView('dashboard')
            }}
            style={{ transform: backPressed ? 'scale(0.95)' : 'scale(1)', transition: 'transform 0.15s' }}
          >
            <span className="text-2xl">🗳️</span>
            <h1 className="text-xl font-bold text-gray-800">实时投票决策看板</h1>
          </div>

          <div className="flex items-center gap-3">
            {nickname && view === 'detail' && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <span>👤</span>
                <span className="font-medium">{nickname}</span>
                <span className="text-gray-400">|</span>
                <span className="font-mono text-indigo-600">{roomCode}</span>
              </div>
            )}
            {view !== 'create' && (
              <button
                onClick={() => {
                  setCreatePressed(true)
                  setTimeout(() => setCreatePressed(false), 150)
                  switchView('create')
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-indigo-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
                style={{
                  borderRadius: '12px',
                  transform: createPressed ? 'scale(0.95)' : 'scale(1)',
                  transition: 'transform 0.15s, all 0.2s',
                }}
              >
                + 创建投票
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div
          style={{
            opacity: contentVisible ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            animation: view === 'dashboard' && !transitioning ? 'fadeIn 0.3s ease-in-out' : undefined,
          }}
        >
          {view === 'dashboard' && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md" style={{ borderRadius: '12px' }}>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">🔑 加入投票房间</h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="输入你的昵称"
                      value={joinNickname}
                      onChange={e => setJoinNickname(e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-gray-700"
                      style={{ borderRadius: '12px' }}
                    />
                    <input
                      type="text"
                      placeholder="输入房间码"
                      value={joinRoomCode}
                      onChange={e => setJoinRoomCode(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors font-mono uppercase text-gray-700"
                      style={{ borderRadius: '12px' }}
                      maxLength={6}
                    />
                    <button
                      onClick={handleJoinRoom}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200"
                      style={{ borderRadius: '12px' }}
                    >
                      加入房间
                    </button>
                  </div>
                  {joinError && (
                    <p className="mt-3 text-red-500 text-sm">⚠️ {joinError}</p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl p-6 shadow-md text-white" style={{ borderRadius: '12px' }}>
                  <h2 className="text-lg font-bold mb-3">💡 使用指南</h2>
                  <ul className="space-y-2 text-sm text-indigo-100">
                    <li>• 创建投票主题生成房间码</li>
                    <li>• 分享房间码给团队成员</li>
                    <li>• 每人仅能投一票，提交后不可修改</li>
                    <li>• 实时查看投票结果与数据洞察</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">📋 全部投票</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortType('time')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      sortType === 'time'
                        ? 'bg-indigo-500 text-white shadow'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    ⏰ 最新创建
                  </button>
                  <button
                    onClick={() => setSortType('hot')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      sortType === 'hot'
                        ? 'bg-indigo-500 text-white shadow'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    🔥 投票热度
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedTopics.map(topic => (
                  <VoteCard
                    key={topic.id}
                    topic={topic}
                    selectedOptionId={null}
                    onSelectOption={() => {}}
                    onSubmit={() => {}}
                    hasVoted={false}
                    votedOptionId={null}
                    view="card"
                    onEnterDetail={() => {
                      if (!nickname) {
                        setJoinRoomCode(topic.roomCode)
                        document.querySelector('input[placeholder="输入你的昵称"]')?.focus()
                      } else {
                        setRoomCode(topic.roomCode)
                        switchView('detail', topic.id)
                      }
                    }}
                  />
                ))}
              </div>

              {sortedTopics.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-5xl mb-4">📭</div>
                  <p>暂无投票主题，点击右上角「创建投票」开始</p>
                </div>
              )}
            </div>
          )}

          {view === 'create' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-md" style={{ borderRadius: '12px' }}>
                <h2 className="text-xl font-bold text-gray-800 mb-6">✨ 创建新投票</h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      投票主题 <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2">({newTitle.length}/50)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="例如：本周团建活动选择"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value.slice(0, 50))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-gray-700"
                      style={{ borderRadius: '12px' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      投票选项 <span className="text-red-500">*</span>
                      <span className="text-gray-400 font-normal ml-2">(4-6个选项)</span>
                    </label>
                    <div className="space-y-3">
                      {newOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <div className="relative">
                            <select
                              value={opt.emoji}
                              onChange={e => updateOption(idx, 'emoji', e.target.value)}
                              className="appearance-none px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-2xl bg-white cursor-pointer"
                              style={{ borderRadius: '12px' }}
                            >
                              {EMOJI_OPTIONS.map(em => (
                                <option key={em} value={em}>
                                  {em}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            placeholder={`选项 ${idx + 1}`}
                            value={opt.text}
                            onChange={e => updateOption(idx, 'text', e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-gray-700"
                            style={{ borderRadius: '12px' }}
                          />
                          {newOptions.length > 4 && (
                            <button
                              onClick={() => removeOption(idx)}
                              className="px-3 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              style={{ borderRadius: '12px' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {newOptions.length < 6 && (
                      <button
                        onClick={addOption}
                        className="mt-3 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-medium transition-colors border-2 border-dashed border-indigo-300 w-full"
                        style={{ borderRadius: '12px' }}
                      >
                        + 添加选项
                      </button>
                    )}
                  </div>

                  {submitMessage && (
                    <div
                      className={`px-4 py-3 rounded-xl text-sm ${
                        submitSuccess ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                      style={{ borderRadius: '12px' }}
                    >
                      {submitSuccess ? '✅' : '⚠️'} {submitMessage}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setBackPressed(true)
                        setTimeout(() => setBackPressed(false), 150)
                        switchView('dashboard')
                      }}
                      className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all"
                      style={{
                        borderRadius: '12px',
                        transform: backPressed ? 'scale(0.95)' : 'scale(1)',
                        transition: 'transform 0.15s, all 0.2s',
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreateTopic}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                      style={{
                        borderRadius: '12px',
                        transform: createPressed ? 'scale(0.95)' : 'scale(1)',
                        transition: 'transform 0.15s, all 0.2s',
                      }}
                    >
                      创建投票
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'detail' && currentTopic && (
            <div>
              <button
                onClick={() => {
                  setBackPressed(true)
                  setTimeout(() => setBackPressed(false), 150)
                  switchView('dashboard')
                }}
                className="mb-4 px-4 py-2 text-gray-600 hover:bg-white hover:text-indigo-600 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-1"
                style={{
                  borderRadius: '12px',
                  transform: backPressed ? 'scale(0.95)' : 'scale(1)',
                  transition: 'transform 0.15s, all 0.2s',
                }}
              >
                ← 返回看板
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-white rounded-xl p-6 shadow-md" style={{ borderRadius: '12px' }}>
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-2">
                      <h2 className="text-xl font-bold text-gray-800">{currentTopic.title}</h2>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium ${
                            currentTopic.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {currentTopic.isActive ? '🟢 进行中' : '⏹️ 已结束'}
                        </span>
                        <span className="text-xs px-3 py-1 rounded-full font-mono bg-indigo-100 text-indigo-700">
                          🔑 {currentTopic.roomCode}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-5">
                      共 {currentStats?.totalVotes || 0} 人参与投票
                      {nickname && <span className="ml-2">· 👤 {nickname}</span>}
                    </p>

                    <VoteCard
                      topic={currentTopic}
                      selectedOptionId={selectedOptionId}
                      onSelectOption={setSelectedOptionId}
                      onSubmit={handleSubmitVote}
                      hasVoted={userHasVoted}
                      votedOptionId={userVotedOptionId}
                      view="detail"
                    />

                    {submitMessage && !userHasVoted && (
                      <div
                        className={`mt-4 px-4 py-3 rounded-xl text-sm ${
                          submitSuccess ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                        style={{ borderRadius: '12px' }}
                      >
                        {submitSuccess ? '✅' : '⚠️'} {submitMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl p-6 shadow-md" style={{ borderRadius: '12px' }}>
                    <h3 className="text-lg font-bold text-gray-800 mb-5">📊 实时投票结果</h3>
                    <ResultChart options={currentTopic.options} triggerParticleKey={particleKey} />
                  </div>

                  {currentStats && (userHasVoted || !currentTopic.isActive) && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-800">📈 数据洞察</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-4 shadow-md" style={{ borderRadius: '12px' }}>
                          <div className="text-xs text-gray-500 mb-1">🏆 排名第一</div>
                          <div className="text-sm font-bold text-emerald-600 truncate">
                            {currentStats.rankings[0]?.emoji} {currentStats.rankings[0]?.text}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {currentStats.rankings[0]?.votes || 0} 票 (
                            {currentStats.totalVotes > 0
                              ? (((currentStats.rankings[0]?.votes || 0) / currentStats.totalVotes) * 100).toFixed(1)
                              : 0}
                            %)
                          </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-md" style={{ borderRadius: '12px' }}>
                          <div className="text-xs text-gray-500 mb-1">⏱️ 平均耗时</div>
                          <div className="text-2xl font-bold text-indigo-600">{currentStats.avgDuration}</div>
                          <div className="text-xs text-gray-400 mt-1">秒</div>
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-md" style={{ borderRadius: '12px' }}>
                          <div className="text-xs text-gray-500 mb-1">📐 得票离散度</div>
                          <div className="text-2xl font-bold text-amber-600">{currentStats.stdDev}</div>
                          <div className="text-xs text-gray-400 mt-1">标准差</div>
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-md" style={{ borderRadius: '12px' }}>
                          <div className="text-xs text-gray-500 mb-1">👥 总票数</div>
                          <div className="text-2xl font-bold text-pink-600">{currentStats.totalVotes}</div>
                          <div className="text-xs text-gray-400 mt-1">人参与</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 shadow-md" style={{ borderRadius: '12px' }}>
                        <div className="text-xs text-gray-500 mb-3">📋 完整排名</div>
                        <div className="space-y-2">
                          {currentStats.rankings.map((r, idx) => (
                            <div key={r.id} className="flex items-center gap-2 text-sm">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  idx === 0
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : idx === 1
                                    ? 'bg-gray-200 text-gray-600'
                                    : idx === 2
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {r.rank}
                              </span>
                              <span className="flex-1 text-gray-700 truncate">
                                {r.emoji} {r.text}
                              </span>
                              <span className="text-gray-400 text-xs">{r.votes}票</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {(userHasVoted || !currentTopic.isActive) && (
                    <button
                      onClick={handleResetVotes}
                      className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold hover:from-amber-600 hover:to-amber-700 shadow-md hover:shadow-lg transition-all"
                      style={{
                        borderRadius: '12px',
                        transform: resetPressed ? 'scale(0.95)' : 'scale(1)',
                        transition: 'transform 0.15s, all 0.2s',
                      }}
                    >
                      🔄 重置投票
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
        实时投票决策看板 · WebSocket实时推送 · 60FPS流畅动画
      </footer>
    </div>
  )
}
