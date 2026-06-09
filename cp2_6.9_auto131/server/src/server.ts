import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { extractKeySentences, processSummariesWithStyle, splitSentences } from './nlp';
import type { SummarizeRequest, SummarizeResponse, StyleType } from '../../shared/types';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.post('/api/summarize', (req, res) => {
  try {
    const { text, style }: SummarizeRequest = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: '文档文本不能为空' });
      return;
    }

    if (text.length > 10000) {
      res.status(400).json({ error: '文档长度不能超过10000字' });
      return;
    }

    const trimmedText = text.trim();
    const summaries = extractKeySentences(trimmedText, 5);

    const currentStyle: StyleType = (style as StyleType) || 'concise';
    const styledSummaries = processSummariesWithStyle(summaries, currentStyle);

    const sentences = splitSentences(trimmedText).map(sp => sp.text);

    const response: SummarizeResponse = {
      summaries: styledSummaries,
      sentences,
      wordCount: trimmedText.length
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing summary:', error);
    res.status(500).json({ error: '处理摘要时发生错误' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '未接收到文件' });
      return;
    }

    const text = req.file.buffer.toString('utf-8');
    const fileName = req.file.originalname;

    if (text.length > 10000) {
      res.status(400).json({ error: '文档长度不能超过10000字' });
      return;
    }

    res.json({ text, fileName });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: '处理文件上传时发生错误' });
  }
});

app.post('/api/style', (req, res) => {
  try {
    const { summaries, style } = req.body;

    if (!summaries || !Array.isArray(summaries)) {
      res.status(400).json({ error: '摘要数据格式错误' });
      return;
    }

    const currentStyle: StyleType = (style as StyleType) || 'concise';
    const styledSummaries = processSummariesWithStyle(summaries, currentStyle);

    res.json({ summaries: styledSummaries });
  } catch (error) {
    console.error('Error applying style:', error);
    res.status(500).json({ error: '调整风格时发生错误' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
