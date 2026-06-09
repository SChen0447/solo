import React from 'react'
import ReactDOM from 'react-dom/client'
import { io, Socket } from 'socket.io-client'
import App from './App'

const socket: Socket = io('http://localhost:3001')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App socket={socket} />
  </React.StrictMode>
)
