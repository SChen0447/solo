import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

function readTeaData() {
  const dataPath = path.join(__dirname, 'tea.json')
  const rawData = fs.readFileSync(dataPath, 'utf-8')
  return JSON.parse(rawData)
}

function calculateEuclideanDistance(pref, teaScores) {
  const dims = ['floral', 'fruity', 'woody', 'honey']
  let sum = 0
  for (let i = 0; i < dims.length; i++) {
    const diff = pref[i] - teaScores[dims[i]]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

function calculateMatchPercentage(distance) {
  const maxDistance = Math.sqrt(4 * 81)
  const percentage = ((maxDistance - distance) / maxDistance) * 100
  return Math.round(percentage * 100) / 100
}

app.get('/api/tea', (_req, res) => {
  try {
    const teas = readTeaData()
    res.json(teas)
  } catch (err) {
    res.status(500).json({ error: '读取茶叶数据失败' })
  }
})

app.post('/api/match', (req, res) => {
  try {
    const { preferences } = req.body

    if (!preferences || !Array.isArray(preferences) || preferences.length !== 4) {
      return res.status(400).json({ error: '偏好参数格式错误，需提供4个维度的评分' })
    }

    for (const p of preferences) {
      if (typeof p !== 'number' || p < 1 || p > 10) {
        return res.status(400).json({ error: '每个维度评分必须为1-10之间的数字' })
      }
    }

    const teas = readTeaData()
    const results = teas.map((tea) => {
      const distance = calculateEuclideanDistance(preferences, tea.scores)
      const matchPercentage = calculateMatchPercentage(distance)
      return {
        ...tea,
        matchScore: matchPercentage,
        distance: Math.round(distance * 100) / 100
      }
    })

    results.sort((a, b) => a.distance - b.distance)
    const top3 = results.slice(0, 3)

    res.json(top3)
  } catch (err) {
    res.status(500).json({ error: '匹配计算失败' })
  }
})

app.listen(PORT, () => {
  console.log(`茶叶品鉴匹配后端服务已启动: http://localhost:${PORT}`)
})
