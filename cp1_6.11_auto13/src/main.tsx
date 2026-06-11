import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ResumeProvider } from './context/ResumeContext'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ResumeProvider>
      <App />
    </ResumeProvider>
  </React.StrictMode>,
)
