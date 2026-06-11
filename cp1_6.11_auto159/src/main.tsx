import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { store } from './store'
import { proxy } from 'valtio'

function initFromHash() {
  const hash = window.location.hash
  const match = hash.match(/#\/artwork\/(.+)/)
  if (match) {
    store.artworkId = match[1]
    const saved = localStorage.getItem(`artwork_${match[1]}`)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        Object.assign(store, data)
      } catch (e) {
        console.error('Failed to load artwork', e)
      }
    }
  }
}

initFromHash()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
