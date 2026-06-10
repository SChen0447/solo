import './CountdownTimer.css'

interface CountdownTimerProps {
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

export default function CountdownTimer({ hours, minutes, seconds, isExpired }: CountdownTimerProps) {
  const pad = (n: number) => n.toString().padStart(2, '0')

  if (isExpired) {
    return (
      <div className="countdown-container">
        <div className="countdown-expired">活动已结束</div>
      </div>
    )
  }

  return (
    <div className="countdown-container">
      <div className="countdown-label">距离结束还剩</div>
      <div className="countdown-display">
        <div className="time-box">{pad(hours)}</div>
        <span className="time-colon">:</span>
        <div className="time-box">{pad(minutes)}</div>
        <span className="time-colon">:</span>
        <div className="time-box">{pad(seconds)}</div>
      </div>
    </div>
  )
}
