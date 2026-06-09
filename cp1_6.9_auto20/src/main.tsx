import React from 'react'
import ReactDOM from 'react-dom/client'
import { Gallery } from './components/Gallery'
import { cards } from './data/cards'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="app-container">
      <div className="bg-gradient" />
      <Gallery cards={cards} />
    </div>
  </React.StrictMode>,
)
