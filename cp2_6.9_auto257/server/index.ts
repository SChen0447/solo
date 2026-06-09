import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import type { Marker, Comment, CreateMarkerRequest, CreateCommentRequest, ScentCategory } from '../src/types'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const markers: Map<string, Marker> = new Map()

const seedMarkers: Marker[] = [
  {
    id: uuidv4(),
    lat: 40.7580,
    lng: -73.9855,
    name: '时代广场热狗香',
    description: '街头小摊飘来的烤肠和黄芥末混合香气，纽约最经典的街头味道。',
    username: 'BigAppleFan',
    category: 'food',
    likes: 42,
    likedBy: [],
    comments: [
      { id: uuidv4(), username: 'Traveler99', content: '闻到这个味道就知道到纽约了！', createdAt: '2024-01-15T10:30:00Z' },
      { id: uuidv4(), username: 'Foodie', content: '必须配一瓶可乐才够味', createdAt: '2024-01-14T15:20:00Z' }
    ],
    createdAt: '2024-01-10T08:00:00Z'
  },
  {
    id: uuidv4(),
    lat: 40.7829,
    lng: -73.9654,
    name: '中央公园草坪',
    description: '雨后修剪过的青草混着泥土的清新气息，都市中的一片绿洲。',
    username: 'NatureLover',
    category: 'nature',
    likes: 78,
    likedBy: [],
    comments: [
      { id: uuidv4(), username: 'Runner', content: '清晨跑步时最喜欢这个味道', createdAt: '2024-01-12T07:00:00Z' }
    ],
    createdAt: '2024-01-08T12:00:00Z'
  },
  {
    id: uuidv4(),
    lat: 40.7484,
    lng: -73.9857,
    name: '帝国大厦花店',
    description: '楼下花店的玫瑰和百合花香，经过时心情都会变好。',
    username: 'FlowerChild',
    category: 'flower',
    likes: 35,
    likedBy: [],
    comments: [],
    createdAt: '2024-01-05T09:30:00Z'
  },
  {
    id: uuidv4(),
    lat: 40.7505,
    lng: -73.9934,
    name: '地铁通风口',
    description: '混合着地铁隧道的金属味、爆米花和些许潮湿的独特城市气息。',
    username: 'Commuter',
    category: 'city',
    likes: 19,
    likedBy: [],
    comments: [
      { id: uuidv4(), username: 'LocalNYC', content: '这就是纽约的味道啊', createdAt: '2024-01-11T18:45:00Z' }
    ],
    createdAt: '2024-01-03T16:15:00Z'
  },
  {
    id: uuidv4(),
    lat: 40.7614,
    lng: -73.9776,
    name: '洛克菲勒圣诞树',
    description: '新鲜冷杉的清香混着热可可和烤栗子的节日气息。',
    username: 'HolidaySpirit',
    category: 'other',
    likes: 92,
    likedBy: [],
    comments: [
      { id: uuidv4(), username: 'XmasFan', content: '每年都要来闻一闻！', createdAt: '2024-01-01T20:00:00Z' },
      { id: uuidv4(), username: 'WinterLover', content: '节日气氛拉满', createdAt: '2024-01-02T14:30:00Z' },
      { id: uuidv4(), username: 'Tourist', content: '太美了！', createdAt: '2024-01-06T11:00:00Z' }
    ],
    createdAt: '2023-12-25T10:00:00Z'
  }
]

seedMarkers.forEach(m => markers.set(m.id, m))

app.get('/api/markers', (req, res) => {
  res.json(Array.from(markers.values()))
})

app.get('/api/markers/:id', (req, res) => {
  const marker = markers.get(req.params.id)
  if (!marker) {
    res.status(404).json({ error: 'Marker not found' })
    return
  }
  res.json(marker)
})

app.post('/api/markers', (req, res) => {
  const body = req.body as CreateMarkerRequest
  if (!body.lat || !body.lng || !body.name || !body.username || !body.category) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  if (body.name.length > 20) {
    res.status(400).json({ error: 'Name too long (max 20 chars)' })
    return
  }
  if (body.username.length > 15) {
    res.status(400).json({ error: 'Username too long (max 15 chars)' })
    return
  }
  if (body.description && body.description.length > 100) {
    res.status(400).json({ error: 'Description too long (max 100 chars)' })
    return
  }

  const newMarker: Marker = {
    id: uuidv4(),
    lat: body.lat,
    lng: body.lng,
    name: body.name,
    description: body.description || '',
    username: body.username,
    category: body.category as ScentCategory,
    likes: 0,
    likedBy: [],
    comments: [],
    createdAt: new Date().toISOString()
  }

  markers.set(newMarker.id, newMarker)
  res.status(201).json(newMarker)
})

app.post('/api/markers/:id/like', (req, res) => {
  const marker = markers.get(req.params.id)
  if (!marker) {
    res.status(404).json({ error: 'Marker not found' })
    return
  }

  marker.likes += 1
  markers.set(marker.id, marker)
  res.json({ likes: marker.likes })
})

app.post('/api/markers/:id/comment', (req, res) => {
  const marker = markers.get(req.params.id)
  if (!marker) {
    res.status(404).json({ error: 'Marker not found' })
    return
  }

  const body = req.body as CreateCommentRequest
  if (!body.username || !body.content) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const newComment: Comment = {
    id: uuidv4(),
    username: body.username,
    content: body.content,
    createdAt: new Date().toISOString()
  }

  marker.comments.unshift(newComment)
  markers.set(marker.id, marker)
  res.status(201).json(newComment)
})

app.listen(PORT, () => {
  console.log(`Smell Map API server running on http://localhost:${PORT}`)
})
