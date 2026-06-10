import { useState, useEffect, useCallback } from 'react'

const INITIAL_STOCK = 100

interface InventoryResult {
  remaining: number
  soldCount: number
  isSoldOut: boolean
  decreaseStock: (amount: number) => void
}

export function useInventory(): InventoryResult {
  const [remaining, setRemaining] = useState<number>(INITIAL_STOCK)
  const [soldCount, setSoldCount] = useState<number>(0)
  const [isSoldOut, setIsSoldOut] = useState<boolean>(false)

  const decreaseStock = useCallback((amount: number) => {
    setRemaining((prev) => {
      const next = Math.max(0, prev - amount)
      if (next === 0) {
        setIsSoldOut(true)
      }
      setSoldCount(INITIAL_STOCK - next)
      return next
    })
  }, [])

  useEffect(() => {
    if (isSoldOut) return

    const scheduleNextReduction = () => {
      const delay = Math.random() * 1500 + 500
      const timer = setTimeout(() => {
        setRemaining((prev) => {
          if (prev <= 0) {
            setIsSoldOut(true)
            return 0
          }
          const amount = Math.floor(Math.random() * 3) + 1
          const next = Math.max(0, prev - amount)
          setSoldCount(INITIAL_STOCK - next)
          if (next === 0) {
            setIsSoldOut(true)
          }
          if (next > 0) {
            scheduleNextReduction()
          }
          return next
        })
      }, delay)
      return timer
    }

    let timer: ReturnType<typeof setTimeout> | null = scheduleNextReduction()

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isSoldOut])

  return { remaining, soldCount, isSoldOut, decreaseStock }
}
