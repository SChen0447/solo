import { useEffect, useRef } from 'react'
import { LogEntry } from './App'

interface OperationLogProps {
  logs: LogEntry[]
  collapsed: boolean
  onToggle: () => void
}

function OperationLog({ logs, collapsed, onToggle }: OperationLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logContainerRef.current && !collapsed) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, collapsed])

  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null

  return (
    <div className={`operation-log ${collapsed ? 'collapsed' : 'expanded'}`}>
      <div className="log-header" onClick={onToggle}>
        <div className="log-title">
          <span className="log-icon">📋</span>
          <span>操作日志</span>
          <span className="log-count">({logs.length})</span>
        </div>
        <button className="toggle-btn">
          {collapsed ? '▲ 展开' : '▼ 收起'}
        </button>
      </div>
      
      {collapsed ? (
        <div className="log-latest">
          {latestLog ? (
            <>
              <span className="log-time">{latestLog.time}</span>
              <span className="log-message">{latestLog.message}</span>
            </>
          ) : (
            <span className="log-empty">暂无操作记录</span>
          )}
        </div>
      ) : (
        <div className="log-container" ref={logContainerRef}>
          {logs.length === 0 ? (
            <div className="log-empty">暂无操作记录</div>
          ) : (
            <div className="log-list">
              {logs.map(log => (
                <div key={log.id} className="log-item">
                  <span className="log-time">[{log.time}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default OperationLog
