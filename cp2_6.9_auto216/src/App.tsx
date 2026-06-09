import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import BookDetailPage from './pages/BookDetailPage'
import ProfilePage from './pages/ProfilePage'
import Header from './components/Header'

type Route =
  | { name: 'home' }
  | { name: 'book'; id: string }
  | { name: 'profile'; id?: string }

function parseHash(): Route {
  const hash = window.location.hash.slice(1) || '/'
  const parts = hash.split('/').filter(Boolean)
  if (parts.length === 0 || parts[0] === '') return { name: 'home' }
  if (parts[0] === 'book' && parts[1]) return { name: 'book', id: parts[1] }
  if (parts[0] === 'profile') return { name: 'profile', id: parts[1] }
  return { name: 'home' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash())

  useEffect(() => {
    const handler = () => setRoute(parseHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = (path: string) => {
    window.location.hash = path
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header onNavigate={navigate} currentRoute={route} />
      <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {route.name === 'home' && <HomePage onNavigate={navigate} />}
        {route.name === 'book' && (
          <BookDetailPage bookId={route.id} onNavigate={navigate} />
        )}
        {route.name === 'profile' && (
          <ProfilePage userId={route.id || 'user-1'} onNavigate={navigate} />
        )}
      </main>
    </div>
  )
}
