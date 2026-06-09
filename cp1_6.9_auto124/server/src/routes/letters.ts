import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from './auth.js'

const prisma = new PrismaClient()
const router = Router()

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { content, envelopeColor, stamp, season, openDate } = req.body

    if (!content || content.length < 20 || content.length > 200) {
      return res.status(400).json({ error: '信件内容需在20-200字之间' })
    }
    if (!envelopeColor || !stamp || !season || !openDate) {
      return res.status(400).json({ error: '请填写所有必要信息' })
    }

    const openDateTime = new Date(openDate)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const openDay = new Date(openDateTime.getFullYear(), openDateTime.getMonth(), openDateTime.getDate())

    if (openDay <= today) {
      return res.status(400).json({ error: '必须选择未来的日期' })
    }

    const letter = await prisma.letter.create({
      data: {
        userId: req.userId!,
        content,
        envelopeColor,
        stamp,
        season,
        openDate: openDateTime,
      },
    })

    res.json(letter)
  } catch (error) {
    res.status(500).json({ error: '创建信件失败' })
  }
})

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const letters = await prisma.letter.findMany({
      where: { userId: req.userId },
      orderBy: { openDate: 'asc' },
    })

    const processed = letters.map((letter) => {
      const now = new Date()
      const isArrived = now >= new Date(letter.openDate)
      return {
        ...letter,
        isArrived,
        content: isArrived ? letter.content : null,
      }
    })

    res.json(processed)
  } catch (error) {
    res.status(500).json({ error: '获取信件失败' })
  }
})

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const letter = await prisma.letter.findUnique({
      where: { id: req.params.id },
    })

    if (!letter || letter.userId !== req.userId) {
      return res.status(404).json({ error: '信件不存在' })
    }

    const now = new Date()
    if (now < new Date(letter.openDate)) {
      return res.status(400).json({ error: '信件尚未到达' })
    }

    await prisma.letter.update({
      where: { id: letter.id },
      data: { isOpened: true },
    })

    res.json(letter)
  } catch (error) {
    res.status(500).json({ error: '获取信件失败' })
  }
})

export default router
