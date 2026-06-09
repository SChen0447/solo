import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import shortid from 'shortid';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const store = new Map<string, string>();

app.post('/api/kv/store', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: '数据不能为空' });
    }
    const key = shortid.generate();
    store.set(key, data);
    res.json({ key });
  } catch (err) {
    res.status(500).json({ error: '存储失败' });
  }
});

app.get('/api/kv/get/:key', (req, res) => {
  try {
    const { key } = req.params;
    const data = store.get(key);
    if (!data) {
      return res.status(404).json({ error: '未找到数据' });
    }
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: '获取失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
