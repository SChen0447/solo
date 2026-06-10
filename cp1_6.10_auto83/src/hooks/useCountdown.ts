import { useState, useEffect } from 'react'

interface CountdownResult {
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

export function useCountdown(targetDate: Date): CountdownResult {
  const calculateTimeLeft = (): CountdownResult => {
    const now = new Date().getTime()
    const target = targetDate.getTime()
    const difference = target - now

    if (difference <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, isExpired: true }
    }

    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
    const minutes = Math.floor((difference / (1000 * 60)) % 60)
    const seconds = Math.floor((difference / 1000) % 60)

    return { hours, minutes, seconds, isExpired: false }
  }

  const [timeLeft, setTimeLeft] = useState<CountdownResult>(calculateTimeLeft)

  useEffect(() => {
    if (timeLeft.isExpired) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = calculateTimeLeft()
        if (next.isExpired) {
          clearInterval(timer)
        }
        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return timeLeft
}
