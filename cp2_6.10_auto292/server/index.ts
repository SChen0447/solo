import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import type {
  Candle,
  Order,
  Customer,
  Database,
  FragranceType,
  OrderStatus,
} from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_PATH = path.join(__dirname, '..', 'data', 'candles.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

function readDatabase(): Database {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as Database;
  } catch (err) {
    console.error('读取数据库失败:', err);
    return { candles: [], orders: [], customers: [] };
  }
}

function writeDatabase(db: Database): void {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('写入数据库失败:', err);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/candles', (req, res) => {
  const db = readDatabase();
  let candles = [...db.candles];

  const search = (req.query.search as string)?.trim() || '';
  const fragrance = req.query.fragrance as FragranceType | undefined;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  if (search) {
    candles = candles.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (fragrance) {
    candles = candles.filter((c) => c.fragrance === fragrance);
  }

  candles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = candles.length;
  const start = (page - 1) * limit;
  const paginated = candles.slice(start, start + limit);

  res.json({
    data: paginated,
    total,
    page,
    limit,
  });
});

app.get('/api/candles/:id', (req, res) => {
  const db = readDatabase();
  const candle = db.candles.find((c) => c.id === req.params.id);
  if (!candle) {
    res.status(404).json({ error: '蜡烛未找到' });
    return;
  }
  res.json(candle);
});

app.post('/api/candles', (req, res) => {
  const db = readDatabase();
  const now = new Date().toISOString();
  const newCandle: Candle = {
    id: uuidv4(),
    name: req.body.name,
    fragrance: req.body.fragrance,
    color: req.body.color || '#ffffff',
    stock: req.body.stock || 0,
    packaging: req.body.packaging,
    tags: req.body.tags || [],
    photoUrl: req.body.photoUrl || '',
    createdAt: now,
  };
  db.candles.push(newCandle);
  writeDatabase(db);
  res.status(201).json(newCandle);
});

app.put('/api/candles/:id', (req, res) => {
  const db = readDatabase();
  const idx = db.candles.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '蜡烛未找到' });
    return;
  }
  db.candles[idx] = { ...db.candles[idx], ...req.body, id: db.candles[idx].id };
  writeDatabase(db);
  res.json(db.candles[idx]);
});

app.delete('/api/candles/:id', (req, res) => {
  const db = readDatabase();
  const idx = db.candles.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '蜡烛未找到' });
    return;
  }
  db.candles.splice(idx, 1);
  writeDatabase(db);
  res.json({ success: true });
});

app.get('/api/orders', (_req, res) => {
  const db = readDatabase();
  const orders = [...db.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const db = readDatabase();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: '订单未找到' });
    return;
  }
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const db = readDatabase();
  const now = new Date().toISOString();
  const newOrder: Order = {
    id: uuidv4(),
    customerName: req.body.customerName,
    customerPhone: req.body.customerPhone,
    items: req.body.items,
    expectedDate: req.body.expectedDate,
    status: (req.body.status as OrderStatus) || '待调配',
    createdAt: now,
  };
  db.orders.push(newOrder);

  let customer = db.customers.find((c) => c.phone === newOrder.customerPhone);
  if (!customer) {
    customer = {
      id: uuidv4(),
      name: newOrder.customerName,
      phone: newOrder.customerPhone,
      notes: '',
      fragrancePreferences: {
        柑橘调: 0,
        花香调: 0,
        木质调: 0,
        草本调: 0,
        东方调: 0,
      },
      lastPurchaseDate: format(new Date(now), 'yyyy-MM-dd'),
      favoritePackaging: null,
      orderHistory: [newOrder.id],
    };
    db.customers.push(customer);
  } else {
    customer.orderHistory.push(newOrder.id);
    customer.lastPurchaseDate = format(new Date(now), 'yyyy-MM-dd');
    customer.name = newOrder.customerName;
  }

  for (const item of newOrder.items) {
    const candle = db.candles.find((c) => c.id === item.candleId);
    if (candle && customer) {
      customer.fragrancePreferences[candle.fragrance] += item.quantity;
      if (!customer.favoritePackaging) {
        customer.favoritePackaging = candle.packaging;
      }
    }
  }

  writeDatabase(db);
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
  const db = readDatabase();
  const idx = db.orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '订单未找到' });
    return;
  }
  db.orders[idx] = { ...db.orders[idx], ...req.body, id: db.orders[idx].id };
  writeDatabase(db);
  res.json(db.orders[idx]);
});

app.delete('/api/orders/:id', (req, res) => {
  const db = readDatabase();
  const idx = db.orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '订单未找到' });
    return;
  }
  db.orders.splice(idx, 1);
  writeDatabase(db);
  res.json({ success: true });
});

app.get('/api/customers', (_req, res) => {
  const db = readDatabase();
  res.json(db.customers);
});

app.get('/api/customers/:id', (req, res) => {
  const db = readDatabase();
  const customer = db.customers.find((c) => c.id === req.params.id);
  if (!customer) {
    res.status(404).json({ error: '客户未找到' });
    return;
  }
  res.json(customer);
});

app.get('/api/customers/by-phone/:phone', (req, res) => {
  const db = readDatabase();
  const customer = db.customers.find((c) => c.phone === req.params.phone);
  res.json(customer || null);
});

app.post('/api/customers', (req, res) => {
  const db = readDatabase();
  const newCustomer: Customer = {
    id: uuidv4(),
    name: req.body.name,
    phone: req.body.phone,
    notes: req.body.notes || '',
    fragrancePreferences: req.body.fragrancePreferences || {
      柑橘调: 0,
      花香调: 0,
      木质调: 0,
      草本调: 0,
      东方调: 0,
    },
    lastPurchaseDate: req.body.lastPurchaseDate || null,
    favoritePackaging: req.body.favoritePackaging || null,
    orderHistory: req.body.orderHistory || [],
  };
  db.customers.push(newCustomer);
  writeDatabase(db);
  res.status(201).json(newCustomer);
});

app.put('/api/customers/:id', (req, res) => {
  const db = readDatabase();
  const idx = db.customers.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '客户未找到' });
    return;
  }
  db.customers[idx] = { ...db.customers[idx], ...req.body, id: db.customers[idx].id };
  writeDatabase(db);
  res.json(db.customers[idx]);
});

app.post('/api/notifications/generate', (req, res) => {
  const db = readDatabase();
  const orderIds: string[] = req.body.orderIds || [];
  const orders = db.orders.filter((o) => orderIds.includes(o.id));

  if (orders.length === 0) {
    res.json({ text: '' });
    return;
  }

  const messages: string[] = [];
  for (const order of orders) {
    const itemNames = order.items.map((i) => `${i.candleName}x${i.quantity}`).join('、');
    const expectedDate = order.expectedDate
      ? format(parseISO(order.expectedDate), 'MM月dd日')
      : '近期';
    messages.push(
      `【香薰蜡烛工坊】尊敬的${order.customerName}客户，您订购的${itemNames}预计将于${expectedDate}完成调配，完成后会第一时间通知您取货哦～感谢您的支持！🕯️`
    );
  }

  res.json({ text: messages.join('\n\n') });
});

app.listen(PORT, () => {
  console.log(`香薰蜡烛工坊后端服务已启动: http://localhost:${PORT}`);
});
