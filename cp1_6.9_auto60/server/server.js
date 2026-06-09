import { createServer } from 'http'
import { Server } from 'socket.io'
import express from 'express'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

const rooms = new Map()

function getRoomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      strokes: [],
      stickyNotes: [],
    })
  }
  return rooms.get(roomId)
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-room', ({ roomId, user }) => {
    const state = getRoomState(roomId)
    socket.join(roomId)

    state.users.set(socket.id, user)

    const usersList = Array.from(state.users.entries()).map(([id, u]) => ({
      id,
      name: u.name,
      color: u.color,
    }))

    socket.emit('room-state', {
      users: usersList,
      strokes: state.strokes,
      stickyNotes: state.stickyNotes,
    })

    socket.to(roomId).emit('user-joined', {
      id: socket.id,
      name: user.name,
      color: user.color,
    })
  })

  socket.on('draw-stroke', ({ roomId, stroke }) => {
    const state = getRoomState(roomId)
    state.strokes.push(stroke)
    socket.to(roomId).emit('stroke-drawn', stroke)
  })

  socket.on('add-sticky-note', ({ roomId, note }) => {
    const state = getRoomState(roomId)
    state.stickyNotes.push(note)
    socket.to(roomId).emit('sticky-note-added', note)
  })

  socket.on('update-sticky-note', ({ roomId, noteId, updates }) => {
    const state = getRoomState(roomId)
    const noteIndex = state.stickyNotes.findIndex((n) => n.id === noteId)
    if (noteIndex !== -1) {
      state.stickyNotes[noteIndex] = {
        ...state.stickyNotes[noteIndex],
        ...updates,
      }
      socket.to(roomId).emit('sticky-note-updated', { noteId, updates })
    }
  })

  socket.on('delete-sticky-note', ({ roomId, noteId }) => {
    const state = getRoomState(roomId)
    state.stickyNotes = state.stickyNotes.filter((n) => n.id !== noteId)
    socket.to(roomId).emit('sticky-note-deleted', noteId)
  })

  socket.on('update-user', ({ roomId, updates }) => {
    const state = getRoomState(roomId)
    const user = state.users.get(socket.id)
    if (user) {
      state.users.set(socket.id, { ...user, ...updates })
      const usersList = Array.from(state.users.entries()).map(([id, u]) => ({
        id,
        name: u.name,
        color: u.color,
      }))
      io.to(roomId).emit('users-updated', usersList)
    }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    rooms.forEach((state, roomId) => {
      if (state.users.has(socket.id)) {
        state.users.delete(socket.id)
        socket.to(roomId).emit('user-left', socket.id)
      }
    })
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
