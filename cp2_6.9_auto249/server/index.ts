import express, { Request, Response } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '..', 'data')

interface Book {
  id: string
  title: string
  author: string
  description: string
  coverUrl: string
  color: string
}

interface Note {
  id: string
  bookId: string
  content: string
  likes: number
  createdAt: number
  rotation: number
  offsetX: number
  offsetY: number
}

const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json())

function readJSONFile<T>(filename: string): T[] {
  const filePath = path.join(dataDir, filename)
  if (!fs.existsSync(filePath)) {
    return []
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as T[]
}

function writeJSONFile<T>(filename: string, data: T[]): void {
  const filePath = path.join(dataDir, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/api/books', (_req: Request, res: Response) => {
  try {
    const books = readJSONFile<Book>('books.json')
    res.json(books)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch books' })
  }
})

app.get('/api/books/:id/notes', (req: Request, res: Response) => {
  try {
    const bookId = req.params.id
    const notes = readJSONFile<Note>('notes.json')
    const bookNotes = notes.filter(n => n.bookId === bookId)
    res.json(bookNotes)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' })
  }
})

app.post('/api/books/:id/notes', (req: Request, res: Response) => {
  try {
    const bookId = req.params.id
    const { content } = req.body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' })
    }

    if (content.length > 200) {
      return res.status(400).json({ error: 'Content must be 200 characters or less' })
    }

    const notes = readJSONFile<Note>('notes.json')
    const newNote: Note = {
      id: uuidv4(),
      bookId,
      content: content.trim(),
      likes: 0,
      createdAt: Date.now(),
      rotation: Math.random() * 6 - 3,
      offsetX: 0,
      offsetY: 0
    }

    notes.push(newNote)
    writeJSONFile('notes.json', notes)
    res.status(201).json(newNote)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' })
  }
})

app.put('/api/notes/:id', (req: Request, res: Response) => {
  try {
    const noteId = req.params.id
    const { likes, offsetX, offsetY } = req.body

    const notes = readJSONFile<Note>('notes.json')
    const noteIndex = notes.findIndex(n => n.id === noteId)

    if (noteIndex === -1) {
      return res.status(404).json({ error: 'Note not found' })
    }

    if (typeof likes === 'number') {
      notes[noteIndex].likes = Math.max(0, likes)
    }
    if (typeof offsetX === 'number') {
      notes[noteIndex].offsetX = Math.max(-15, Math.min(15, offsetX))
    }
    if (typeof offsetY === 'number') {
      notes[noteIndex].offsetY = Math.max(-15, Math.min(15, offsetY))
    }

    writeJSONFile('notes.json', notes)
    res.json(notes[noteIndex])
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' })
  }
})

app.listen(PORT, () => {
  console.log(`书事后端服务运行在 http://localhost:${PORT}`)
})
