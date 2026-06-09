import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import letterRoutes from './routes/letters.js'
import { startCronJob } from './cron.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/letters', letterRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

startCronJob()

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
