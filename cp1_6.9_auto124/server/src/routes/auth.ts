import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: Function) => {
  const userId = req.headers['x-user-id'] as string
  if (!userId) {
    return res.status(401).json({ error: '未授权' })
  }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return res.status(401).json({ error: '用户不存在' })
  }
  req.userId = userId
  next()
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: '邮箱已被注册' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })

    const openDate = new Date()
    openDate.setHours(openDate.getHours() + 24)

    await prisma.letter.create({
      data: {
        userId: user.id,
        content: '亲爱的时间信使，\n\n欢迎来到时光邮局！这里是你穿越时间的驿站。\n\n写一封信给未来的自己或挚爱之人，选择心仪的信封和邮票，设定一个未来的日期。时光会替你保管这封信，直到那一天的到来。\n\n愿每一封信都载着最真的心意，穿越岁月，温柔抵达。\n\n—— 时光邮局',
        envelopeColor: '#e8d5b7',
        stamp: 'sakura',
        season: 'spring',
        openDate,
      },
    })

    res.json({ id: user.id, email: user.email })
  } catch (error) {
    res.status(500).json({ error: '注册失败' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码必填' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(400).json({ error: '邮箱或密码错误' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(400).json({ error: '邮箱或密码错误' })
    }

    res.json({ id: user.id, email: user.email })
  } catch (error) {
    res.status(500).json({ error: '登录失败' })
  }
})

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, createdAt: true },
  })
  res.json(user)
})

export default router
