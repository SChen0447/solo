import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

let foods = []
let idCounter = 1

const validateCategory = (category) => {
  const valid = ['水果', '蔬菜', '主食', '蛋白质', '零食', '饮品']
  return valid.includes(category)
}

const validateMealTime = (mealTime) => {
  const valid = ['早餐', '午餐', '晚餐', '加餐']
  return valid.includes(mealTime)
}

const validateFeeling = (feeling) => {
  const valid = ['精力好', '胀气', '不舒服', '无感']
  return valid.includes(feeling)
}

app.get('/api/foods', (req, res) => {
  const { category, feeling } = req.query
  let result = [...foods]
  if (category && validateCategory(category)) {
    result = result.filter(f => f.category === category)
  }
  if (feeling && validateFeeling(feeling)) {
    result = result.filter(f => f.feeling === feeling)
  }
  result.sort((a, b) => b.timestamp - a.timestamp)
  res.json(result)
})

app.post('/api/foods', (req, res) => {
  const { category, name, mealTime } = req.body
  if (!validateCategory(category)) {
    return res.status(400).json({ error: '无效的食物类别' })
  }
  if (!name || typeof name !== 'string' || name.length > 20) {
    return res.status(400).json({ error: '食物名称无效（最多20字）' })
  }
  if (!validateMealTime(mealTime)) {
    return res.status(400).json({ error: '无效的就餐时段' })
  }
  const food = {
    id: idCounter++,
    category,
    name: name.trim(),
    mealTime,
    timestamp: Date.now(),
    feeling: null
  }
  foods.push(food)
  res.status(201).json(food)
})

app.patch('/api/foods/:id/feeling', (req, res) => {
  const id = parseInt(req.params.id)
  const { feeling } = req.body
  const food = foods.find(f => f.id === id)
  if (!food) {
    return res.status(404).json({ error: '未找到该食物记录' })
  }
  if (feeling !== null && !validateFeeling(feeling)) {
    return res.status(400).json({ error: '无效的身体感受' })
  }
  food.feeling = feeling
  res.json(food)
})

app.delete('/api/foods/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const index = foods.findIndex(f => f.id === id)
  if (index === -1) {
    return res.status(404).json({ error: '未找到该食物记录' })
  }
  foods.splice(index, 1)
  res.status(204).send()
})

app.delete('/api/foods', (req, res) => {
  foods = []
  idCounter = 1
  res.status(204).send()
})

app.listen(PORT, () => {
  console.log(`Food tracker server running on port ${PORT}`)
})
