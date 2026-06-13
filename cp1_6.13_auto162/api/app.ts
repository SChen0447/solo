import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

interface ModuleState {
  id: string
  name: string
  x: number
  y: number
  playing: boolean
  volume: number
}

interface Preset {
  id: string
  name: string
  modules: ModuleState[]
}

const presets: Preset[] = []

app.post('/api/presets', (req: Request, res: Response): void => {
  const { name, modules } = req.body
  if (!name || !Array.isArray(modules)) {
    res.status(400).json({ success: false, error: 'name and modules are required' })
    return
  }
  const preset: Preset = {
    id: uuidv4(),
    name,
    modules,
  }
  presets.push(preset)
  res.status(201).json({ success: true, data: preset })
})

app.get('/api/presets', (_req: Request, res: Response): void => {
  const list = presets.map((p) => ({ id: p.id, name: p.name }))
  res.json({ success: true, data: list })
})

app.get('/api/presets/:id', (req: Request, res: Response): void => {
  const preset = presets.find((p) => p.id === req.params.id)
  if (!preset) {
    res.status(404).json({ success: false, error: 'Preset not found' })
    return
  }
  res.json({ success: true, data: preset })
})

app.use(
  '/api/health',
  (_req: Request, res: Response): void => {
    res.status(200).json({ success: true, message: 'ok' })
  },
)

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
