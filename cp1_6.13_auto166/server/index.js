const express = require('express')
const cors = require('cors')
const multer = require('multer')
const Jimp = require('jimp')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

const DATA_DIR = path.join(__dirname, 'data')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
const THUMBNAILS_DIR = path.join(DATA_DIR, 'thumbnails')
const HYBRIDS_DIR = path.join(DATA_DIR, 'hybrids')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })
if (!fs.existsSync(HYBRIDS_DIR)) fs.mkdirSync(HYBRIDS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (req, file, cb) => {
    const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    const ext = path.extname(file.originalname)
    cb(null, uniqueId + ext)
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只支持 JPG 和 PNG 格式'))
    }
  }
})

let plants = []
let hybrids = []
let votes = {}
let voteSessions = {}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

const funnyDescriptions = [
  '这株植物既有仙人掌的棱角又有玫瑰的高贵，堪称植物界的"混血王子"',
  '它继承了多肉的憨厚与藤蔓的灵动，是个可爱的矛盾体',
  '看这叶子的形状，仿佛能听到它在说"我爸妈都很厉害"',
  '一株充满惊喜的杂交体，左边像妈妈右边像爸爸',
  '完美融合了两种植物的优点，哦不，也可能是缺点',
  '这颜值，放在植物界绝对是顶流水平',
  '它的出现证明了：跨界的才是最潮的',
  '据说闻起来有淡淡的青草香和...另一种青草香？',
  '植物学家看了都要愣三秒的神奇组合',
  '从它的眼神里，我看到了星辰大海...哦不对，是叶绿素',
  '这株植物完美诠释了什么叫"青出于蓝而胜于蓝"',
  '一半是海水一半是火焰，它就是植物界的双子座',
  '如果你仔细看，会发现它在努力生长，像极了每天摸鱼的你我',
  '新品种暂定名"乱七八糟但有点好看"',
  '它的存在就是为了证明想象力没有边界'
]

const getRandomDescription = () => {
  return funnyDescriptions[Math.floor(Math.random() * funnyDescriptions.length)]
}

const generateThumbnail = async (inputPath, outputPath, size = 200) => {
  const image = await Jimp.read(inputPath)
  image
    .cover(size, size)
    .roundCorners(12)

  const borderSize = 2
  const borderColor = 0x4caf50ff
  const newSize = size + borderSize * 2
  const borderImage = new Jimp(newSize, newSize, borderColor)
  borderImage.composite(image, borderSize, borderSize)

  await borderImage.writeAsync(outputPath)
  return outputPath
}

const createHybridImage = async (img1Path, img2Path, outputPath) => {
  const img1 = await Jimp.read(img1Path)
  const img2 = await Jimp.read(img2Path)

  const size = 300
  img1.cover(size, size)
  img2.cover(size, size)

  const alpha = 0.4 + Math.random() * 0.2

  const hybrid = img1.clone()
  img2.opacity(alpha)
  hybrid.composite(img2, 0, 0)

  await hybrid.writeAsync(outputPath)
  return outputPath
}

const calculateSimilarity = () => {
  return Math.floor(30 + Math.random() * 70)
}

app.get('/api/plants', (req, res) => {
  const result = plants.map(p => ({
    id: p.id,
    name: p.name,
    stage: p.stage,
    imageUrl: `/api/plants/${p.id}/image`,
    thumbnailUrl: `/api/plants/${p.id}/thumbnail`,
    createdAt: p.createdAt
  }))
  res.json(result)
})

app.get('/api/plants/:id/image', (req, res) => {
  const plant = plants.find(p => p.id === req.params.id)
  if (!plant) {
    return res.status(404).json({ error: '植物不存在' })
  }
  res.sendFile(plant.imagePath, (err) => {
    if (err) res.status(404).json({ error: '图片不存在' })
  })
})

app.get('/api/plants/:id/thumbnail', (req, res) => {
  const plant = plants.find(p => p.id === req.params.id)
  if (!plant) {
    return res.status(404).json({ error: '植物不存在' })
  }
  res.sendFile(plant.thumbnailPath, (err) => {
    if (err) res.status(404).json({ error: '缩略图不存在' })
  })
})

app.post('/api/plants/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' })
    }

    const { name, stage } = req.body
    const plantId = generateId()
    const thumbnailFilename = plantId + path.extname(req.file.filename)
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename)

    await generateThumbnail(req.file.path, thumbnailPath, 200)

    const plant = {
      id: plantId,
      name: name || '未命名植物',
      stage: stage || 'mature',
      imagePath: req.file.path,
      thumbnailPath: thumbnailPath,
      createdAt: new Date().toISOString()
    }

    plants.unshift(plant)

    res.json({
      id: plant.id,
      name: plant.name,
      stage: plant.stage,
      imageUrl: `/api/plants/${plant.id}/image`,
      thumbnailUrl: `/api/plants/${plant.id}/thumbnail`,
      createdAt: plant.createdAt
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: '上传失败' })
  }
})

app.post('/api/hybrids', async (req, res) => {
  try {
    const { parent1Id, parent2Id } = req.body

    const parent1 = plants.find(p => p.id === parent1Id)
    const parent2 = plants.find(p => p.id === parent2Id)

    if (!parent1 || !parent2) {
      return res.status(404).json({ error: '亲本植物不存在' })
    }

    const hybridId = generateId()
    const hybridFilename = hybridId + '.png'
    const hybridPath = path.join(HYBRIDS_DIR, hybridFilename)

    await createHybridImage(parent1.imagePath, parent2.imagePath, hybridPath)

    const similarityScore = calculateSimilarity()
    const description = getRandomDescription()

    const hybrid = {
      id: hybridId,
      parent1Id,
      parent2Id,
      parent1Name: parent1.name,
      parent2Name: parent2.name,
      hybridImagePath: hybridPath,
      similarityScore,
      description,
      votes: 0,
      createdAt: new Date().toISOString()
    }

    hybrids.unshift(hybrid)
    votes[hybridId] = 0

    res.json({
      id: hybrid.id,
      parent1Id: hybrid.parent1Id,
      parent2Id: hybrid.parent2Id,
      parent1Name: hybrid.parent1Name,
      parent2Name: hybrid.parent2Name,
      hybridImageUrl: `/api/hybrids/${hybrid.id}/image`,
      similarityScore: hybrid.similarityScore,
      description: hybrid.description,
      votes: hybrid.votes,
      createdAt: hybrid.createdAt
    })
  } catch (error) {
    console.error('Hybrid error:', error)
    res.status(500).json({ error: '杂交失败' })
  }
})

app.get('/api/hybrids/:id', (req, res) => {
  const hybrid = hybrids.find(h => h.id === req.params.id)
  if (!hybrid) {
    return res.status(404).json({ error: '杂交记录不存在' })
  }

  res.json({
    id: hybrid.id,
    parent1Id: hybrid.parent1Id,
    parent2Id: hybrid.parent2Id,
    parent1Name: hybrid.parent1Name,
    parent2Name: hybrid.parent2Name,
    hybridImageUrl: `/api/hybrids/${hybrid.id}/image`,
    similarityScore: hybrid.similarityScore,
    description: hybrid.description,
    votes: votes[hybrid.id] || 0,
    createdAt: hybrid.createdAt
  })
})

app.get('/api/hybrids/:id/image', (req, res) => {
  const hybrid = hybrids.find(h => h.id === req.params.id)
  if (!hybrid) {
    return res.status(404).json({ error: '杂交记录不存在' })
  }
  res.sendFile(hybrid.hybridImagePath, (err) => {
    if (err) res.status(404).json({ error: '图片不存在' })
  })
})

app.post('/api/hybrids/:id/vote', (req, res) => {
  const hybridId = req.params.id
  const hybrid = hybrids.find(h => h.id === hybridId)

  if (!hybrid) {
    return res.status(404).json({ error: '杂交记录不存在' })
  }

  const sessionId = req.headers['x-session-id'] || req.ip

  if (voteSessions[sessionId]?.includes(hybridId)) {
    return res.status(400).json({ error: '已经点过赞了' })
  }

  if (!voteSessions[sessionId]) {
    voteSessions[sessionId] = []
  }
  voteSessions[sessionId].push(hybridId)

  votes[hybridId] = (votes[hybridId] || 0) + 1
  hybrid.votes = votes[hybridId]

  res.json({ votes: votes[hybridId] })
})

app.get('/api/rankings', (req, res) => {
  const ranked = hybrids
    .map(h => ({
      id: h.id,
      parent1Id: h.parent1Id,
      parent2Id: h.parent2Id,
      parent1Name: h.parent1Name,
      parent2Name: h.parent2Name,
      hybridImageUrl: `/api/hybrids/${h.id}/image`,
      similarityScore: h.similarityScore,
      description: h.description,
      votes: votes[h.id] || 0,
      createdAt: h.createdAt
    }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 10)

  res.json(ranked)
})

app.use('/api/data', express.static(DATA_DIR))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', plants: plants.length, hybrids: hybrids.length })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`🌿 绿镜·杂交工坊 后端服务已启动`)
  console.log(`📍 服务地址: http://localhost:${PORT}`)
  console.log(`📁 数据目录: ${DATA_DIR}`)
})
