import { useState, useEffect, useCallback } from 'react'
import PollChart from './components/PollChart'
import { createPoll, getPoll, votePoll, type Poll, type PollOption } from './utils/api'

type PageType = 'create' | 'vote' | 'result'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('create')
  const [pollCode, setPollCode] = useState('')
  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasVoted, setHasVoted] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [deadline, setDeadline] = useState('')
  const [selectedOption, setSelectedOption] = useState('')

  const navigateToCreate = useCallback(() => {
    setCurrentPage('create')
    setPollCode('')
    setPoll(null)
    setError('')
    setHasVoted(false)
    setJoinCode('')
    setTitle('')
    setOptions(['', ''])
    setDeadline('')
    setSelectedOption('')
  }, [])

  const navigateToVote = useCallback((code: string) => {
    setCurrentPage('vote')
    setPollCode(code)
    setPoll(null)
    setError('')
    setHasVoted(false)
    setSelectedOption('')
  }, [])

  const navigateToResult = useCallback((code: string) => {
    setCurrentPage('result')
    setPollCode(code)
    setPoll(null)
    setError('')
  }, [])

  const fetchPollData = useCallback(async () => {
    if (!pollCode) return
    try {
      const data = await getPoll(pollCode)
      setPoll(data)
      setError('')
    } catch (err: any) {
      setError(err.message)
    }
  }, [pollCode])

  useEffect(() => {
    if (pollCode && (currentPage === 'vote' || currentPage === 'result')) {
      fetchPollData()
      const interval = setInterval(() => {
        fetchPollData()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [pollCode, currentPage, fetchPollData])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (!hash) {
        navigateToCreate()
        return
      }
      const parts = hash.split('/')
      const page = parts[0]
      const code = parts[1] || ''
      if (page === 'vote' && code) {
        navigateToVote(code)
      } else if (page === 'result' && code) {
        navigateToResult(code)
      } else {
        navigateToCreate()
      }
    }
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [navigateToCreate, navigateToVote, navigateToResult])

  const handleAddOption = () => {
    if (options.length < 8) {
      setOptions([...options, ''])
    }
  }

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleCreatePoll = async () => {
    setError('')
    if (!title.trim()) {
      setError('请输入投票标题')
      return
    }
    const validOptions = options.filter((opt) => opt.trim())
    if (validOptions.length < 2) {
      setError('请至少输入2个选项')
      return
    }
    if (!deadline) {
      setError('请选择截止时间')
      return
    }
    const deadlineDate = new Date(deadline)
    if (deadlineDate <= new Date()) {
      setError('截止时间必须晚于当前时间')
      return
    }

    setLoading(true)
    try {
      const result = await createPoll({
        title: title.trim(),
        options: validOptions.map((opt) => opt.trim()),
        deadline: deadlineDate.toISOString(),
      })
      window.location.hash = `#/vote/${result.code}`
      navigateToVote(result.code)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async () => {
    if (!selectedOption) {
      setError('请选择一个选项')
      return
    }
    setLoading(true)
    try {
      await votePoll(pollCode, selectedOption)
      setHasVoted(true)
      await fetchPollData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinPoll = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code || code.length !== 6) {
      setError('请输入6位投票码')
      return
    }
    window.location.hash = `#/vote/${code}`
    navigateToVote(code)
  }

  const exportToCSV = () => {
    if (!poll) return
    let csv = '选项,票数,占比\n'
    const total = poll.options.reduce((sum, opt) => sum + opt.votes, 0)
    poll.options.forEach((opt) => {
      const percentage = total > 0 ? ((opt.votes / total) * 100).toFixed(2) : '0.00'
      csv += `"${opt.text}",${opt.votes},${percentage}%\n`
    })
    csv += `\n总票数,${total},100%\n`
    csv += `投票标题,"${poll.title}"\n`
    csv += `投票码,${poll.code}\n`
    csv += `创建时间,${new Date(poll.createdAt).toLocaleString()}\n`
    csv += `截止时间,${new Date(poll.deadline).toLocaleString()}\n`

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `投票结果_${poll.code}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getWinningOptionId = (): string | undefined => {
    if (!poll || poll.options.length === 0) return undefined
    const maxVotes = Math.max(...poll.options.map((opt) => opt.votes))
    if (maxVotes === 0) return undefined
    const winners = poll.options.filter((opt) => opt.votes === maxVotes)
    if (winners.length === 1) return winners[0].id
    return undefined
  }

  const formatDeadline = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTimeRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now()
    if (diff <= 0) return '已截止'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}天${hours % 24}小时`
    }
    return `${hours}小时${minutes}分钟`
  }

  return (
    <div style={appStyle}>
      <header style={headerStyle}>
        <div style={headerContentStyle}>
          <h1 style={logoStyle} onClick={navigateToCreate}>
            🗳️ 团队投票决策工具
          </h1>
          <nav style={navStyle}>
            <button style={navLinkStyle} onClick={navigateToCreate}>
              创建投票
            </button>
            {pollCode && (
              <button style={navLinkStyle} onClick={() => navigateToResult(pollCode)}>
                查看结果
              </button>
            )}
          </nav>
        </div>
      </header>

      <main style={mainStyle}>
        {currentPage === 'create' && (
          <div style={pageStyle} className="fade-in">
            <div style={cardStyle}>
              <h2 style={cardTitleStyle}>创建新投票</h2>
              <p style={cardSubtitleStyle}>快速创建一个匿名投票，分享给团队成员参与</p>

              <div style={formGroupStyle}>
                <label style={labelStyle}>投票标题</label>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="请输入投票标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>投票选项 ({options.length}/8)</label>
                {options.map((opt, index) => (
                  <div key={index} style={optionRowStyle}>
                    <span style={optionIndexStyle}>{index + 1}.</span>
                    <input
                      type="text"
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder={`选项 ${index + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      maxLength={50}
                    />
                    {options.length > 2 && (
                      <button style={removeBtnStyle} onClick={() => handleRemoveOption(index)}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 8 && (
                  <button style={addOptionBtnStyle} onClick={handleAddOption}>
                    + 添加选项
                  </button>
                )}
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>截止时间</label>
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              {error && <div style={errorStyle}>{error}</div>}

              <button
                style={{ ...primaryBtnStyle, width: '100%', marginTop: '24px' }}
                onClick={handleCreatePoll}
                disabled={loading}
              >
                {loading ? '创建中...' : '创建投票'}
              </button>
            </div>

            <div style={{ ...cardStyle, marginTop: '24px' }}>
              <h3 style={cardTitleStyle}>加入投票</h3>
              <p style={cardSubtitleStyle}>输入6位投票码参与投票</p>
              <div style={optionRowStyle}>
                <input
                  type="text"
                  style={{ ...inputStyle, flex: 1, textTransform: 'uppercase', letterSpacing: '2px' }}
                  placeholder="请输入6位投票码"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <button style={primaryBtnStyle} onClick={handleJoinPoll}>
                  加入
                </button>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'vote' && (
          <div style={pageStyle} className="fade-in">
            {loading && !poll && <div style={loadingStyle}>加载中...</div>}
            {error && !poll && <div style={errorStyle}>{error}</div>}

            {poll && (
              <>
                <div style={cardStyle}>
                  <div style={codeBadgeStyle}>
                    投票码: <span style={{ fontWeight: 'bold', letterSpacing: '2px' }}>{poll.code}</span>
                  </div>
                  <h2 style={cardTitleStyle}>{poll.title}</h2>

                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>截止时间:</span>
                    <span style={poll.isExpired ? expiredTextStyle : infoValueStyle}>
                      {formatDeadline(poll.deadline)}
                    </span>
                  </div>
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>剩余时间:</span>
                    <span style={poll.isExpired ? expiredTextStyle : infoValueStyle}>
                      {getTimeRemaining(poll.deadline)}
                    </span>
                  </div>
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>已投票数:</span>
                    <span style={infoValueStyle}>{poll.totalVotes || 0} 票</span>
                  </div>

                  {poll.isExpired ? (
                    <div style={expiredBannerStyle}>
                      ⏰ 投票已截止
                      <button
                        style={{ ...secondaryBtnStyle, marginLeft: '12px' }}
                        onClick={() => navigateToResult(pollCode)}
                      >
                        查看结果
                      </button>
                    </div>
                  ) : hasVoted ? (
                    <div style={successBannerStyle}>
                      ✅ 您已成功投票！
                      <button
                        style={{ ...secondaryBtnStyle, marginLeft: '12px' }}
                        onClick={() => navigateToResult(pollCode)}
                      >
                        查看结果
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={formGroupStyle}>
                        <label style={labelStyle}>请选择一个选项</label>
                        {poll.options.map((opt) => (
                          <div
                            key={opt.id}
                            style={{
                              ...optionCardStyle,
                              borderColor: selectedOption === opt.id ? '#2B6CB0' : '#E2E8F0',
                              backgroundColor: selectedOption === opt.id ? '#EBF8FF' : '#ffffff',
                            }}
                            onClick={() => setSelectedOption(opt.id)}
                          >
                            <div
                              style={{
                                ...radioStyle,
                                borderColor: selectedOption === opt.id ? '#2B6CB0' : '#CBD5E0',
                              }}
                            >
                              {selectedOption === opt.id && <div style={radioInnerStyle} />}
                            </div>
                            <span style={optionTextStyle}>{opt.text}</span>
                          </div>
                        ))}
                      </div>

                      {error && <div style={errorStyle}>{error}</div>}

                      <button
                        style={{ ...primaryBtnStyle, width: '100%' }}
                        onClick={handleVote}
                        disabled={loading || !selectedOption}
                      >
                        {loading ? '提交中...' : '提交投票'}
                      </button>

                      <p style={tipStyle}>🔒 匿名投票，每人只能投一次</p>
                    </>
                  )}
                </div>

                {(hasVoted || poll.isExpired) && poll.totalVotes && poll.totalVotes > 0 && (
                  <div style={{ ...cardStyle, marginTop: '24px' }}>
                    <h3 style={cardTitleStyle}>实时结果</h3>
                    <PollChart options={poll.options} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentPage === 'result' && (
          <div style={pageStyle} className="fade-in">
            {loading && !poll && <div style={loadingStyle}>加载中...</div>}
            {error && !poll && <div style={errorStyle}>{error}</div>}

            {poll && (
              <>
                <div style={cardStyle}>
                  <div style={codeBadgeStyle}>
                    投票码: <span style={{ fontWeight: 'bold', letterSpacing: '2px' }}>{poll.code}</span>
                  </div>
                  <h2 style={cardTitleStyle}>{poll.title}</h2>

                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>截止时间:</span>
                    <span style={poll.isExpired ? expiredTextStyle : infoValueStyle}>
                      {formatDeadline(poll.deadline)}
                    </span>
                  </div>
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>总票数:</span>
                    <span style={infoValueStyle}>{poll.totalVotes || 0} 票</span>
                  </div>
                  <div style={infoRowStyle}>
                    <span style={infoLabelStyle}>状态:</span>
                    <span style={poll.isExpired ? expiredTextStyle : { color: '#38A169', fontWeight: 600 }}>
                      {poll.isExpired ? '已截止' : '进行中'}
                    </span>
                  </div>

                  {poll.isExpired && getWinningOptionId() && (
                    <div style={winnerBannerStyle}>
                      🏆 获胜选项: {poll.options.find((o) => o.id === getWinningOptionId())?.text}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <button
                      style={secondaryBtnStyle}
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/#/vote/${poll.code}`
                        )
                        alert('投票链接已复制到剪贴板')
                      }}
                    >
                      📋 分享投票
                    </button>
                    <button style={secondaryBtnStyle} onClick={exportToCSV}>
                      📥 导出 CSV
                    </button>
                    <button
                      style={secondaryBtnStyle}
                      onClick={() => navigateToVote(pollCode)}
                    >
                      🗳️ 去投票
                    </button>
                  </div>
                </div>

                <div style={{ ...cardStyle, marginTop: '24px' }}>
                  <h3 style={cardTitleStyle}>投票结果</h3>
                  {poll.totalVotes && poll.totalVotes > 0 ? (
                    <PollChart options={poll.options} winningOptionId={getWinningOptionId()} />
                  ) : (
                    <div style={emptyStyle}>暂无投票数据</div>
                  )}
                </div>

                <div style={{ ...cardStyle, marginTop: '24px' }}>
                  <h3 style={cardTitleStyle}>详细数据</h3>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={tableHeaderStyle}>
                        <th style={tableCellStyle}>排名</th>
                        <th style={tableCellStyle}>选项</th>
                        <th style={tableCellStyle}>票数</th>
                        <th style={tableCellStyle}>占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...poll.options]
                        .sort((a, b) => b.votes - a.votes)
                        .map((opt, index) => {
                          const total = poll.totalVotes || 0
                          const percentage = total > 0 ? ((opt.votes / total) * 100).toFixed(1) : '0.0'
                          const isWinner = opt.id === getWinningOptionId() && poll.isExpired
                          return (
                            <tr
                              key={opt.id}
                              style={{
                                ...tableRowStyle,
                                backgroundColor: isWinner ? '#FFF5E6' : undefined,
                              }}
                            >
                              <td style={tableCellStyle}>
                                {index === 0 && total > 0 ? '🥇' : index === 1 && total > 0 ? '🥈' : index === 2 && total > 0 ? '🥉' : index + 1}
                              </td>
                              <td style={{ ...tableCellStyle, fontWeight: isWinner ? 700 : 400 }}>
                                {opt.text}
                                {isWinner && <span style={{ marginLeft: '8px' }}>🏆</span>}
                              </td>
                              <td style={tableCellStyle}>{opt.votes}</td>
                              <td style={tableCellStyle}>{percentage}%</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer style={footerStyle}>
        <p style={footerTextStyle}>团队投票决策工具 · 匿名、实时、轻量</p>
      </footer>

      <style>{`
        .fade-in {
          animation: fadeInUp 0.3s ease;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #F0F4F8;
        }
        button {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        input {
          transition: all 0.2s ease;
        }
        input:focus {
          outline: none;
          border-color: #2B6CB0 !important;
          box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
        }
        @media (max-width: 1024px) {
          .charts-container {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .card {
            padding: 16px;
          }
          h2 {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  )
}

const appStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#F0F4F8',
  display: 'flex',
  flexDirection: 'column',
}

const headerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
}

const headerContentStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '16px 24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const logoStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#2B6CB0',
  margin: 0,
  cursor: 'pointer',
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
}

const navLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#4A5568',
  fontSize: '14px',
  padding: '8px 12px',
  borderRadius: '6px',
  fontWeight: 500,
}

const mainStyle: React.CSSProperties = {
  flex: 1,
  maxWidth: '800px',
  width: '100%',
  margin: '0 auto',
  padding: '32px 24px',
}

const pageStyle: React.CSSProperties = {
  animation: 'fadeInUp 0.3s ease',
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '28px',
  boxShadow: '0 2px 8px rgba(43, 108, 176, 0.08)',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#2D3748',
  margin: '0 0 8px 0',
}

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#718096',
  margin: '0 0 24px 0',
}

const formGroupStyle: React.CSSProperties = {
  marginBottom: '20px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: '#2D3748',
  marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#2D3748',
  backgroundColor: '#ffffff',
}

const optionRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '10px',
}

const optionIndexStyle: React.CSSProperties = {
  color: '#A0AEC0',
  fontSize: '14px',
  width: '24px',
}

const removeBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: '1px solid #E2E8F0',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  color: '#A0AEC0',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const addOptionBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  border: '1px dashed #CBD5E0',
  backgroundColor: '#F7FAFC',
  borderRadius: '8px',
  color: '#4A5568',
  fontSize: '14px',
  marginTop: '8px',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '12px 24px',
  backgroundColor: '#2B6CB0',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 16px',
  backgroundColor: '#EDF2F7',
  color: '#2D3748',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
}

const errorStyle: React.CSSProperties = {
  backgroundColor: '#FEB2B2',
  color: '#C53030',
  padding: '12px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  marginBottom: '16px',
}

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  color: '#718096',
}

const codeBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#EBF8FF',
  color: '#2B6CB0',
  padding: '6px 14px',
  borderRadius: '20px',
  fontSize: '13px',
  marginBottom: '16px',
}

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #F0F4F8',
  fontSize: '14px',
}

const infoLabelStyle: React.CSSProperties = {
  color: '#718096',
}

const infoValueStyle: React.CSSProperties = {
  color: '#2D3748',
  fontWeight: 500,
}

const expiredTextStyle: React.CSSProperties = {
  color: '#E53E3E',
  fontWeight: 600,
}

const expiredBannerStyle: React.CSSProperties = {
  backgroundColor: '#FED7D7',
  color: '#C53030',
  padding: '14px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  marginTop: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const successBannerStyle: React.CSSProperties = {
  backgroundColor: '#C6F6D5',
  color: '#22543D',
  padding: '14px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  marginTop: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const winnerBannerStyle: React.CSSProperties = {
  backgroundColor: '#FEEBC8',
  color: '#7B341E',
  padding: '14px 16px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  marginTop: '16px',
  textAlign: 'center',
}

const optionCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 16px',
  border: '2px solid #E2E8F0',
  borderRadius: '8px',
  marginBottom: '10px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}

const radioStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  border: '2px solid #CBD5E0',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const radioInnerStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  backgroundColor: '#2B6CB0',
  borderRadius: '50%',
}

const optionTextStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#2D3748',
}

const tipStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#A0AEC0',
  textAlign: 'center',
  marginTop: '12px',
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  color: '#A0AEC0',
  fontSize: '14px',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '12px',
}

const tableHeaderStyle: React.CSSProperties = {
  backgroundColor: '#F7FAFC',
}

const tableCellStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  borderBottom: '1px solid #E2E8F0',
  fontSize: '14px',
  color: '#2D3748',
}

const tableRowStyle: React.CSSProperties = {
  transition: 'background-color 0.2s ease',
}

const footerStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '24px',
  color: '#A0AEC0',
}

const footerTextStyle: React.CSSProperties = {
  fontSize: '13px',
  margin: 0,
}

export default App
