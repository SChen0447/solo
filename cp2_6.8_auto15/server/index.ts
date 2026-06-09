import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(bodyParser.json())

interface Recipe {
  id: string
  name: string
  category: string
  ingredients: string[]
  steps: string[]
  cookTime: number
  image: string
}

interface Note {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}

interface UserData {
  favorites: string[]
  notes: Record<string, Note[]>
}

const recipesPath = path.join(__dirname, 'recipes.json')
const userDataPath = path.join(__dirname, 'userData.json')

const readRecipes = (): Recipe[] => {
  const data = fs.readFileSync(recipesPath, 'utf-8')
  return JSON.parse(data)
}

const readUserData = (): UserData => {
  const data = fs.readFileSync(userDataPath, 'utf-8')
  return JSON.parse(data)
}

const writeUserData = (data: UserData) => {
  fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2), 'utf-8')
}

interface RecipeWithMatch extends Recipe {
  matchCount: number
  matchRatio: number
}

app.get('/api/recipes/recommend', (req, res) => {
  const ingredientsParam = req.query.ingredients as string
  if (!ingredientsParam) {
    return res.status(400).json({ error: '请输入食材' })
  }

  const userIngredients = ingredientsParam
    .split(',')
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0)

  if (userIngredients.length === 0) {
    return res.status(400).json({ error: '请输入至少一种食材' })
  }

  const recipes = readRecipes()

  const matchedRecipes: RecipeWithMatch[] = recipes
    .map(recipe => {
      const recipeIngredients = recipe.ingredients.map(i => i.toLowerCase())
      const matchCount = userIngredients.filter(ing =>
        recipeIngredients.some(ri => ri.includes(ing) || ing.includes(ri))
      ).length
      const matchRatio = matchCount / recipe.ingredients.length
      return { ...recipe, matchCount, matchRatio }
    })
    .filter(recipe => recipe.matchCount >= 2)
    .sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount
      }
      return b.matchRatio - a.matchRatio
    })

  res.json(matchedRecipes)
})

app.get('/api/recipes/random', (_req, res) => {
  const recipes = readRecipes()
  const randomIndex = Math.floor(Math.random() * recipes.length)
  res.json(recipes[randomIndex])
})

app.get('/api/recipes/:id', (req, res) => {
  const recipes = readRecipes()
  const recipe = recipes.find(r => r.id === req.params.id)
  if (!recipe) {
    return res.status(404).json({ error: '菜谱不存在' })
  }
  res.json(recipe)
})

app.get('/api/recipes', (_req, res) => {
  const recipes = readRecipes()
  res.json(recipes)
})

app.get('/api/favorites', (_req, res) => {
  const userData = readUserData()
  const recipes = readRecipes()
  const favoriteRecipes = recipes.filter(r => userData.favorites.includes(r.id))
  res.json(favoriteRecipes)
})

app.post('/api/favorites', (req, res) => {
  const { recipeId } = req.body
  if (!recipeId) {
    return res.status(400).json({ error: '缺少菜谱ID' })
  }

  const userData = readUserData()
  if (!userData.favorites.includes(recipeId)) {
    userData.favorites.push(recipeId)
    writeUserData(userData)
  }

  const recipes = readRecipes()
  const favoriteRecipes = recipes.filter(r => userData.favorites.includes(r.id))
  res.json(favoriteRecipes)
})

app.delete('/api/favorites/:recipeId', (req, res) => {
  const userData = readUserData()
  userData.favorites = userData.favorites.filter(id => id !== req.params.recipeId)
  writeUserData(userData)

  const recipes = readRecipes()
  const favoriteRecipes = recipes.filter(r => userData.favorites.includes(r.id))
  res.json(favoriteRecipes)
})

app.get('/api/notes/:recipeId', (req, res) => {
  const userData = readUserData()
  const notes = userData.notes[req.params.recipeId] || []
  res.json(notes)
})

app.post('/api/notes/:recipeId', (req, res) => {
  const { content } = req.body
  if (!content) {
    return res.status(400).json({ error: '笔记内容不能为空' })
  }

  const userData = readUserData()
  const recipeId = req.params.recipeId

  const newNote: Note = {
    id: uuidv4(),
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  if (!userData.notes[recipeId]) {
    userData.notes[recipeId] = []
  }
  userData.notes[recipeId].unshift(newNote)
  writeUserData(userData)

  res.json(newNote)
})

app.put('/api/notes/:recipeId/:noteId', (req, res) => {
  const { content } = req.body
  if (!content) {
    return res.status(400).json({ error: '笔记内容不能为空' })
  }

  const userData = readUserData()
  const { recipeId, noteId } = req.params

  if (!userData.notes[recipeId]) {
    return res.status(404).json({ error: '笔记不存在' })
  }

  const noteIndex = userData.notes[recipeId].findIndex(n => n.id === noteId)
  if (noteIndex === -1) {
    return res.status(404).json({ error: '笔记不存在' })
  }

  userData.notes[recipeId][noteIndex] = {
    ...userData.notes[recipeId][noteIndex],
    content,
    updatedAt: new Date().toISOString()
  }
  writeUserData(userData)

  res.json(userData.notes[recipeId][noteIndex])
})

app.delete('/api/notes/:recipeId/:noteId', (req, res) => {
  const userData = readUserData()
  const { recipeId, noteId } = req.params

  if (!userData.notes[recipeId]) {
    return res.status(404).json({ error: '笔记不存在' })
  }

  userData.notes[recipeId] = userData.notes[recipeId].filter(n => n.id !== noteId)
  writeUserData(userData)

  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
