import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const checkArrivedLetters = async () => {
  console.log('检查到期信件...')
  try {
    const now = new Date()
    const letters = await prisma.letter.findMany({
      where: {
        notified: false,
        openDate: {
          lte: now,
        },
      },
      include: {
        user: true,
      },
    })

    for (const letter of letters) {
      console.log(`信件 ${letter.id} 已到达，收件人: ${letter.user.email}`)
      await prisma.letter.update({
        where: { id: letter.id },
        data: { notified: true },
      })
    }

    console.log(`本次检查完成，共处理 ${letters.length} 封到达信件`)
  } catch (error) {
    console.error('检查到期信件失败:', error)
  }
}

export const startCronJob = () => {
  cron.schedule('0 9 * * *', () => {
    checkArrivedLetters()
  })
  console.log('定时任务已启动：每天上午9:00检查到期信件')
}
