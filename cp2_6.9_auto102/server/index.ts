import express from 'express'
import cors from 'cors'

interface ColorStop {
  color: string
  position: number
}

interface GradientScheme {
  id: string
  name: string
  angle: number
  colorStops: ColorStop[]
  blurRadius: number
  createdAt: number
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const schemeStore = new Map<string, GradientScheme>()

app.get('/api/schemes', (_req, res) => {
  const schemes = Array.from(schemeStore.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10)
  res.json(schemes)
})

app.post('/api/schemes', (req, res) => {
  const { name, angle, colorStops, blurRadius } = req.body as {
    name: string
    angle: number
    colorStops: ColorStop[]
    blurRadius: number
  }

  if (!name || name.length > 20) {
    return res.status(400).json({ error: 'Name must be 1-20 characters' })
  }

  const existing = Array.from(schemeStore.values()).find(s => s.name === name)
  const id = existing?.id || crypto.randomUUID()

  const scheme: GradientScheme = {
    id,
    name,
    angle,
    colorStops,
    blurRadius,
    createdAt: Date.now()
  }

  schemeStore.set(id, scheme)
  res.json(scheme)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
