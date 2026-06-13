import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface Painting {
  id: string
  title: string
  artist: string
  thumbnail: string
  dominantColor: string
  secondaryColor: string
  accentColor: string
  description: string
}

interface Stamp {
  id: string
  paintingId: string
  type: 'star' | 'flame'
  timestamp: number
}

interface StampCounts {
  [paintingId: string]: {
    star: number
    flame: number
  }
}

const colorPalettes = [
  { dominant: '#FF6B6B', secondary: '#FFA07A', accent: '#FFD93D' },
  { dominant: '#4ECDC4', secondary: '#7DCEA0', accent: '#A8E6CF' },
  { dominant: '#667EEA', secondary: '#764BA2', accent: '#C39BD3' },
  { dominant: '#F39C12', secondary: '#E67E22', accent: '#F8C471' },
  { dominant: '#3498DB', secondary: '#5DADE2', accent: '#85C1E9' },
  { dominant: '#9B59B6', secondary: '#BB8FCE', accent: '#D7BDE2' }
]

const createPlaceholderImage = (width: number, height: number, color: string, index: number): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorPalettes[index % 6].secondary};stop-opacity:1" />
        </linearGradient>
        <filter id="glow${index}">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad${index})" rx="16"/>
      <circle cx="${width * 0.3}" cy="${height * 0.35}" r="${Math.min(width, height) * 0.18}" fill="${colorPalettes[index % 6].accent}" opacity="0.6" filter="url(#glow${index})"/>
      <circle cx="${width * 0.7}" cy="${height * 0.65}" r="${Math.min(width, height) * 0.22}" fill="${colorPalettes[(index + 2) % 6].accent}" opacity="0.5" filter="url(#glow${index})"/>
      <polygon points="${width * 0.5},${height * 0.2} ${width * 0.62},${height * 0.5} ${width * 0.5},${height * 0.8} ${width * 0.38},${height * 0.5}" fill="white" opacity="0.15"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Inter, sans-serif" font-size="14" font-weight="600" opacity="0.9">
        Artwork ${index + 1}
      </text>
    </svg>
  `
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const samplePaintings: Painting[] = [
  {
    id: 'p1',
    title: '晨曦微光',
    artist: '林岚',
    thumbnail: createPlaceholderImage(240, 160, colorPalettes[0].dominant, 0),
    dominantColor: colorPalettes[0].dominant,
    secondaryColor: colorPalettes[0].secondary,
    accentColor: colorPalettes[0].accent,
    description: '清晨的第一缕阳光穿透薄雾，染红了整片天空。'
  },
  {
    id: 'p2',
    title: '翡翠山谷',
    artist: '苏墨',
    thumbnail: createPlaceholderImage(240, 160, colorPalettes[1].dominant, 1),
    dominantColor: colorPalettes[1].dominant,
    secondaryColor: colorPalettes[1].secondary,
    accentColor: colorPalettes[1].accent,
    description: '翠绿的山谷中，溪水潺潺，生机盎然。'
  },
  {
    id: 'p3',
    title: '紫霞幻梦',
    artist: '云舒',
    thumbnail: createPlaceholderImage(240, 160, colorPalettes[2].dominant, 2),
    dominantColor: colorPalettes[2].dominant,
    secondaryColor: colorPalettes[2].secondary,
    accentColor: colorPalettes[2].accent,
    description: '紫色的梦境中，星光点点，如梦似幻。'
  },
  {
    id: 'p4',
    title: '金秋时光',
    artist: '叶枫',
    thumbnail: createPlaceholderImage(240, 160, colorPalettes[3].dominant, 3),
    dominantColor: colorPalettes[3].dominant,
    secondaryColor: colorPalettes[3].secondary,
    accentColor: colorPalettes[3].accent,
    description: '金黄的枫叶铺满大地，诉说着岁月的故事。'
  },
  {
    id: 'p5',
    title: '深海幽蓝',
    artist: '沈舟',
    thumbnail: createPlaceholderImage(240, 160, colorPalettes[4].dominant, 4),
    dominantColor: colorPalettes[4].dominant,
    secondaryColor: colorPalettes[4].secondary,
    accentColor: colorPalettes[4].accent,
    description: '深海的幽蓝之中，隐藏着无尽的秘密。'
  },
  {
    id: 'p6',
    title: '薰衣草田',
    artist: '花语',
    thumbnail: createPlaceholderImage(240, 160, colorPalettes[5].dominant, 5),
    dominantColor: colorPalettes[5].dominant,
    secondaryColor: colorPalettes[5].secondary,
    accentColor: colorPalettes[5].accent,
    description: '紫色的薰衣草田，随风摇曳，芬芳四溢。'
  }
]

const stamps: Stamp[] = []

const calculateStampCounts = (): StampCounts => {
  const counts: StampCounts = {}
  samplePaintings.forEach(p => {
    counts[p.id] = { star: 0, flame: 0 }
  })
  stamps.forEach(s => {
    if (counts[s.paintingId]) {
      counts[s.paintingId][s.type]++
    }
  })
  return counts
}

app.get('/api/paintings', (_req: Request, res: Response) => {
  try {
    const stampCounts = calculateStampCounts()
    const paintingsWithCounts = samplePaintings.map(p => ({
      ...p,
      stamps: stampCounts[p.id] || { star: 0, flame: 0 }
    }))
    res.json(paintingsWithCounts)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch paintings' })
  }
})

app.post('/api/stamp', (req: Request, res: Response) => {
  try {
    const { paintingId, type } = req.body

    if (!paintingId || !type) {
      return res.status(400).json({ error: 'Missing required fields: paintingId and type' })
    }

    if (type !== 'star' && type !== 'flame') {
      return res.status(400).json({ error: 'Invalid stamp type. Must be "star" or "flame"' })
    }

    const paintingExists = samplePaintings.some(p => p.id === paintingId)
    if (!paintingExists) {
      return res.status(404).json({ error: 'Painting not found' })
    }

    const newStamp: Stamp = {
      id: uuidv4(),
      paintingId,
      type,
      timestamp: Date.now()
    }

    stamps.push(newStamp)

    const stampCounts = calculateStampCounts()
    res.json({
      success: true,
      stamp: newStamp,
      counts: stampCounts[paintingId]
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stamp' })
  }
})

app.get('/api/stamps', (_req: Request, res: Response) => {
  try {
    res.json(stamps)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stamps' })
  }
})

app.listen(PORT, () => {
  console.log(`[Server] Halo Gallery API running on http://localhost:${PORT}`)
  console.log(`[Server] Available endpoints:`)
  console.log(`[Server]   GET  /api/paintings - Get all paintings with stamp counts`)
  console.log(`[Server]   POST /api/stamp     - Create a stamp rating`)
  console.log(`[Server]   GET  /api/stamps    - Get all stamps`)
})
