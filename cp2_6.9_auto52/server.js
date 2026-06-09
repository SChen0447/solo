import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const rules = [
  {
    id: 'R001',
    keywords: ['退货', '退换', '退款', '退钱', '退回'],
    reply: '您好！我们支持7天无理由退换货。商品需保持原包装、未使用且不影响二次销售。退款将在收到退货后的3-5个工作日内原路退回。如有疑问可继续咨询。',
    priority: 1
  },
  {
    id: 'R002',
    keywords: ['物流', '快递', '发货', '多久到', '几天到', '配送', '送货'],
    reply: '您好！我们默认使用顺丰快递，下单后24小时内发货，一般3-5个工作日送达。您可以在"我的订单"中查看物流详情。偏远地区可能延迟1-2天。',
    priority: 2
  },
  {
    id: 'R003',
    keywords: ['价格', '多少钱', '优惠', '便宜', '打折', '优惠活动', '促销'],
    reply: '您好！我们的商品价格以页面显示为准，如有优惠活动会在首页和商品详情页标注。新用户首单可享9折优惠，满299元包邮。',
    priority: 3
  },
  {
    id: 'R004',
    keywords: ['尺码', '大小', '尺寸', '码数', '合身'],
    reply: '您好！商品页面有详细的尺码表，请参考尺码表选择合适的尺码。如有疑问，建议您提供身高体重，我来帮您推荐。',
    priority: 4
  },
  {
    id: 'R005',
    keywords: ['质量', '保修', '售后', '坏了', '故障', '维修'],
    reply: '您好！我们所有商品均为正品，享受全国联保服务。保修期内非人为损坏可免费维修，保修期外提供有偿维修服务。',
    priority: 5
  },
  {
    id: 'R006',
    keywords: ['人工', '客服', '转人工', '找客服'],
    reply: '正在为您转接人工客服，请稍候...',
    priority: 6,
    transferHuman: true
  }
];

const DEFAULT_REPLY = '请稍等，将为您转接人工客服';

function matchRule(message) {
  const lowerMessage = message.toLowerCase();

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return {
          ruleId: rule.id,
          reply: rule.reply,
          transferHuman: rule.transferHuman || false,
          matched: true
        };
      }
    }
  }

  return {
    ruleId: null,
    reply: DEFAULT_REPLY,
    transferHuman: true,
    matched: false
  };
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const conversationHistory = [];
const userSessions = new Map();

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  userSessions.set(socket.id, {
    userId: socket.id,
    connectedAt: new Date().toISOString(),
    messageCount: 0
  });

  socket.on('user_message', (data) => {
    const { messageId, content, timestamp } = data;
    console.log(`[${socket.id}] 收到消息: ${content}`);

    const startTime = Date.now();
    const matchResult = matchRule(content);

    const record = {
      id: uuidv4(),
      socketId: socket.id,
      userMessage: content,
      botReply: matchResult.reply,
      ruleId: matchResult.ruleId,
      timestamp: timestamp || new Date().toISOString()
    };
    conversationHistory.unshift(record);

    const processingTime = Date.now() - startTime;
    const delay = Math.max(0, 100 - processingTime);

    setTimeout(() => {
      socket.emit('bot_reply', {
        userMessageId: messageId,
        reply: matchResult.reply,
        ruleId: matchResult.ruleId,
        transferHuman: matchResult.transferHuman
      });
    }, delay);

    const session = userSessions.get(socket.id);
    if (session) {
      session.messageCount++;
    }
  });

  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    userSessions.delete(socket.id);
  });
});

app.get('/api/history', (req, res) => {
  let { startDate, endDate, limit } = req.query;

  let result = [...conversationHistory];

  if (startDate) {
    const start = new Date(startDate + 'T00:00:00.000Z');
    result = result.filter((r) => new Date(r.timestamp) >= start);
  }

  if (endDate) {
    const end = new Date(endDate + 'T23:59:59.999Z');
    result = result.filter((r) => new Date(r.timestamp) <= end);
  }

  if (limit) {
    const limitNum = parseInt(limit, 10);
    if (!isNaN(limitNum) && limitNum > 0) {
      result = result.slice(0, limitNum);
    }
  }

  res.json({
    total: result.length,
    history: result.map(({ socketId, ...rest }) => rest)
  });
});

app.get('/api/stats', (req, res) => {
  const stats = {
    totalConversations: conversationHistory.length,
    activeUsers: userSessions.size,
    rulesMatched: conversationHistory.filter((r) => r.ruleId !== null).length,
    transferredToHuman: conversationHistory.filter((r) => r.ruleId === null).length
  };
  res.json(stats);
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`客服机器人服务器运行在端口 ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`历史记录API: http://localhost:${PORT}/api/history`);
});
