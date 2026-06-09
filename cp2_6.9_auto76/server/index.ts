import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { parseRegex } from '../src/RegexParser';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/parse', (req, res) => {
  try {
    const { regex } = req.body;
    if (typeof regex !== 'string') {
      return res.status(400).json({ error: '正则表达式必须是字符串' });
    }
    const ast = parseRegex(regex);
    res.json({ success: true, ast });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '解析失败'
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`正则解析服务已启动: http://localhost:${PORT}`);
});
