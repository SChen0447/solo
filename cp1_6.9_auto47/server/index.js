import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'data')

const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

const app = express()
app.use(cors())
app.use(bodyParser.json({ limit: '10mb' }))

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(RECIPES_FILE)) {
    fs.writeFileSync(RECIPES_FILE, JSON.stringify([], null, 2))
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2))
  }
}

ensureDataDir()

const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return []
  }
}

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

const generateAvatarColor = () => {
  const colors = ['#E8A87C', '#F4D03F', '#C38D9E', '#85DCBA', '#41B3A3', '#E27D60', '#88D8B0', '#FFEAA7']
  return colors[Math.floor(Math.random() * colors.length)]
}

const hashPassword = (password) => {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}

app.post('/api/auth/register', (req, res) => {
  const { email, password, username } = req.body
  if (!email || !password || !username) {
    return res.status(400).json({ error: '请填写所有必填字段' })
  }

  const users = readJSON(USERS_FILE)
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: '该邮箱已被注册' })
  }

  const user = {
    id: uuidv4(),
    email,
    username,
    passwordHash: hashPassword(password),
    avatarColor: generateAvatarColor(),
    favorites: [],
    createdAt: new Date().toISOString()
  }
  users.push(user)
  writeJSON(USERS_FILE, users)

  const { passwordHash, ...safeUser } = user
  res.json({ user: safeUser, message: '注册成功' })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: '请填写邮箱和密码' })
  }

  const users = readJSON(USERS_FILE)
  const user = users.find(u => u.email === email && u.passwordHash === hashPassword(password))

  if (!user) {
    return res.status(401).json({ error: '邮箱或密码错误' })
  }

  const { passwordHash, ...safeUser } = user
  res.json({ user: safeUser, message: '登录成功' })
})

app.get('/api/users/:id', (req, res) => {
  const users = readJSON(USERS_FILE)
  const user = users.find(u => u.id === req.params.id)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  const { passwordHash, ...safeUser } = user
  res.json({ user: safeUser })
})

app.put('/api/users/:id/favorites', (req, res) => {
  const { recipeId, action } = req.body
  const users = readJSON(USERS_FILE)
  const idx = users.findIndex(u => u.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ error: '用户不存在' })
  }

  const user = users[idx]
  if (action === 'add') {
    if (!user.favorites.includes(recipeId)) {
      user.favorites.push(recipeId)
    }
  } else if (action === 'remove') {
    user.favorites = user.favorites.filter(id => id !== recipeId)
  }

  users[idx] = user
  writeJSON(USERS_FILE, users)

  const { passwordHash, ...safeUser } = user
  res.json({ user: safeUser })
})

app.get('/api/recipes', (req, res) => {
  const { search, userId, page = 1, limit = 50 } = req.query
  let recipes = readJSON(RECIPES_FILE)

  if (search) {
    const keyword = String(search).toLowerCase()
    recipes = recipes.filter(r => r.title.toLowerCase().includes(keyword))
  }

  if (userId) {
    recipes = recipes.filter(r => r.authorId === userId)
  }

  const start = (Number(page) - 1) * Number(limit)
  const end = start + Number(limit)
  const paged = recipes.slice(start, end)

  res.json({
    recipes: paged,
    total: recipes.length,
    page: Number(page),
    limit: Number(limit)
  })
})

app.get('/api/recipes/:id', (req, res) => {
  const recipes = readJSON(RECIPES_FILE)
  const recipe = recipes.find(r => r.id === req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: '食谱不存在' })
  }

  const users = readJSON(USERS_FILE)
  const author = users.find(u => u.id === recipe.authorId)
  if (author) {
    const { passwordHash, password, ...authorInfo } = author
    recipe.author = {
      id: authorInfo.id,
      username: authorInfo.username,
      avatarColor: authorInfo.avatarColor,
      email: authorInfo.email
    }
  }

  res.json({ recipe })
})

app.post('/api/recipes', (req, res) => {
  const { title, ingredients, steps, cookTime, difficulty, authorId, thumbnail } = req.body

  if (!title || !authorId) {
    return res.status(400).json({ error: '缺少必要字段' })
  }
  if (title.length > 50) {
    return res.status(400).json({ error: '标题不能超过50字' })
  }

  const recipes = readJSON(RECIPES_FILE)
  const recipe = {
    id: uuidv4(),
    title,
    ingredients: ingredients || [],
    steps: steps || [],
    cookTime: Number(cookTime) || 0,
    difficulty: difficulty || '简单',
    authorId,
    thumbnail: thumbnail || '',
    likes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  recipes.unshift(recipe)
  writeJSON(RECIPES_FILE, recipes)
  res.json({ recipe, message: '发布成功' })
})

app.put('/api/recipes/:id', (req, res) => {
  const { title, ingredients, steps, cookTime, difficulty, thumbnail } = req.body
  const recipes = readJSON(RECIPES_FILE)
  const idx = recipes.findIndex(r => r.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ error: '食谱不存在' })
  }

  if (title && title.length > 50) {
    return res.status(400).json({ error: '标题不能超过50字' })
  }

  recipes[idx] = {
    ...recipes[idx],
    title: title ?? recipes[idx].title,
    ingredients: ingredients ?? recipes[idx].ingredients,
    steps: steps ?? recipes[idx].steps,
    cookTime: cookTime !== undefined ? Number(cookTime) : recipes[idx].cookTime,
    difficulty: difficulty ?? recipes[idx].difficulty,
    thumbnail: thumbnail ?? recipes[idx].thumbnail,
    updatedAt: new Date().toISOString()
  }
  writeJSON(RECIPES_FILE, recipes)
  res.json({ recipe: recipes[idx], message: '更新成功' })
})

app.delete('/api/recipes/:id', (req, res) => {
  const recipes = readJSON(RECIPES_FILE)
  const filtered = recipes.filter(r => r.id !== req.params.id)
  if (filtered.length === recipes.length) {
    return res.status(404).json({ error: '食谱不存在' })
  }
  writeJSON(RECIPES_FILE, filtered)
  res.json({ message: '删除成功' })
})

app.put('/api/recipes/:id/like', (req, res) => {
  const { userId, action } = req.body
  const recipes = readJSON(RECIPES_FILE)
  const idx = recipes.findIndex(r => r.id === req.params.id)
  if (idx === -1) {
    return res.status(404).json({ error: '食谱不存在' })
  }

  const recipe = recipes[idx]
  if (action === 'add') {
    if (!recipe.likes.includes(userId)) {
      recipe.likes.push(userId)
    }
  } else if (action === 'remove') {
    recipe.likes = recipe.likes.filter(id => id !== userId)
  }

  recipes[idx] = recipe
  writeJSON(RECIPES_FILE, recipes)
  res.json({ recipe })
})

app.get('/api/recipes/user/:userId/favorites', (req, res) => {
  const users = readJSON(USERS_FILE)
  const user = users.find(u => u.id === req.params.userId)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  const recipes = readJSON(RECIPES_FILE)
  const favorites = recipes.filter(r => user.favorites.includes(r.id))
  res.json({ recipes: favorites })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Recipe API server running on http://localhost:${PORT}`)
})
