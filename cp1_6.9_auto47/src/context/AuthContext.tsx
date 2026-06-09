import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'recipe_app_user'

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const persistUser = (u: User | null) => {
    setUser(u)
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (res.ok && data.user) {
        persistUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.error || '登录失败' }
    } catch {
      return { success: false, error: '网络错误，请重试' }
    }
  }

  const register = async (email: string, password: string, username: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      })
      const data = await res.json()
      if (res.ok && data.user) {
        persistUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.error || '注册失败' }
    } catch {
      return { success: false, error: '网络错误，请重试' }
    }
  }

  const logout = () => persistUser(null)

  const updateUser = (u: User) => persistUser(u)

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
