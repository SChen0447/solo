import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { useSocket } from './hooks/useSocket'

const Root: React.FC = () => {
  const { socket, isConnected } = useSocket()

  return (
    <React.StrictMode>
      <App socket={socket} isHost={true} />
    </React.StrictMode>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error("Failed to find the root element")
}

ReactDOM.createRoot(rootElement).render(<Root />)
