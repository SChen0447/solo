export type WsMessageType =
  | 'emoji'
  | 'poll_create'
  | 'poll_vote'
  | 'poll_revoke'
  | 'user_join'
  | 'user_leave'
  | 'user_list'
  | 'ping'
  | 'pong'

export interface WsMessage<T = unknown> {
  type: WsMessageType
  sessionId: string
  userId: string
  timestamp: number
  payload: T
}

type MessageCallback = (message: WsMessage) => void

const HEARTBEAT_INTERVAL = 30000
const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAYS = [1000, 2000, 4000]

class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string
  private sessionId: string
  private userId: string
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private messageCallbacks: Set<MessageCallback> = new Set()
  private messageQueue: WsMessage[] = []
  private isConnecting = false

  constructor(url: string, sessionId: string, userId: string) {
    this.url = url
    this.sessionId = sessionId
    this.userId = userId
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)
    } catch (error) {
      this.isConnecting = false
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.flushQueue()
      this.send('user_join', { userId: this.userId })
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data)
        if (message.type === 'ping') {
          this.send('pong', {})
          return
        }
        this.messageCallbacks.forEach((cb) => cb(message))
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    this.ws.onerror = () => {
      this.isConnecting = false
    }

    this.ws.onclose = () => {
      this.isConnecting = false
      this.stopHeartbeat()
      this.scheduleReconnect()
    }
  }

  disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.send('user_leave', { userId: this.userId })
      }
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS
  }

  send<T = unknown>(type: WsMessageType, payload: T): void {
    const message: WsMessage<T> = {
      type,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      payload,
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback)
    return () => this.messageCallbacks.delete(callback)
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', {})
      }
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return
    }

    const delay = RECONNECT_DELAYS[this.reconnectAttempts]
    this.reconnectAttempts++

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message))
      }
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export default WebSocketManager
