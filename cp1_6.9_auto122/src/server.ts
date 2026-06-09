import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Bouquet {
  id: string;
  name: string;
  price: number;
  description: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface CustomBouquet {
  baseId: string;
  baseName: string;
  colorTone: string;
  colorShade: number;
  flowerType: string;
  message: string;
  unitPrice: number;
  quantity: number;
}

export type OrderStatus = 'confirmed' | 'preparing' | 'delivering' | 'delivered';

export interface DeliveryInfo {
  name: string;
  phone: string;
  address: string;
  deliveryTime: string;
  gridX: number;
  gridY: number;
}

export interface Order {
  id: number;
  items: CustomBouquet[];
  totalPrice: number;
  deliveryInfo: DeliveryInfo;
  status: OrderStatus;
  createdAt: string;
  deliveryPersonPosition?: { x: number; y: number };
}

const flowerShop: Bouquet[] = [
  { id: 'b1', name: '浪漫玫瑰', price: 199, description: '经典红玫瑰11朵', gradientFrom: '#ff6b9d', gradientTo: '#c44569' },
  { id: 'b2', name: '粉色梦幻', price: 259, description: '粉色玫瑰与满天星', gradientFrom: '#f8b500', gradientTo: '#ff6b9d' },
  { id: 'b3', name: '纯白百合', price: 299, description: '香水百合6枝', gradientFrom: '#e0e0e0', gradientTo: '#ffffff' },
  { id: 'b4', name: '向日葵之歌', price: 169, description: '向日葵9朵', gradientFrom: '#ffd93d', gradientTo: '#ff9500' },
  { id: 'b5', name: '紫色优雅', price: 329, description: '紫色洋桔梗', gradientFrom: '#a29bfe', gradientTo: '#6c5ce7' },
  { id: 'b6', name: '郁金香花园', price: 279, description: '荷兰进口郁金香', gradientFrom: '#fd79a8', gradientTo: '#e84393' },
  { id: 'b7', name: '混合缤纷', price: 399, description: '多种鲜花组合', gradientFrom: '#74b9ff', gradientTo: '#a29bfe' },
  { id: 'b8', name: '香槟之夜', price: 349, description: '香槟玫瑰19朵', gradientFrom: '#ffeaa7', gradientTo: '#fdcb6e' },
  { id: 'b9', name: '清新小雏菊', price: 149, description: '白色小雏菊', gradientFrom: '#dfe6e9', gradientTo: '#b2bec3' },
  { id: 'b10', name: '红色热恋', price: 459, description: '99朵红玫瑰', gradientFrom: '#ff4757', gradientTo: '#c44569' },
];

export const colorTones: Record<string, string[]> = {
  red: ['#ff4757', '#ff6b81', '#ff9f9f'],
  pink: ['#ff6b9d', '#ffa0c2', '#ffc6d9'],
  white: ['#ffffff', '#f8f9fa', '#e9ecef'],
  yellow: ['#ffd93d', '#ffe066', '#fff3b0'],
  purple: ['#9b59b6', '#a569bd', '#c39bd3'],
};

export const colorToneNames: Record<string, string> = {
  red: '红色',
  pink: '粉色',
  white: '白色',
  yellow: '黄色',
  purple: '紫色',
};

export const flowerTypes = [
  { id: 'rose', name: '玫瑰', icon: '🌹' },
  { id: 'tulip', name: '郁金香', icon: '🌷' },
  { id: 'lily', name: '百合', icon: '💐' },
  { id: 'sunflower', name: '向日葵', icon: '🌻' },
  { id: 'mixed', name: '混合', icon: '🌸' },
];

const orders: Order[] = [];
let nextOrderId = 10001;

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.get('/api/bouquets', (_req, res) => {
  res.json(flowerShop);
});

app.get('/api/orders', (_req, res) => {
  res.json([...orders].reverse());
});

app.get('/api/orders/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const order = orders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const { items, totalPrice, deliveryInfo } = req.body;
  const gridX = Math.floor(Math.random() * 4) + 1;
  const gridY = Math.floor(Math.random() * 3) + 1;

  const order: Order = {
    id: nextOrderId++,
    items,
    totalPrice,
    deliveryInfo: { ...deliveryInfo, gridX, gridY },
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    deliveryPersonPosition: { x: 0, y: 0 },
  };
  orders.push(order);
  res.json(order);

  setTimeout(() => {
    order.status = 'preparing';
    io.emit(`order:${order.id}`, { status: order.status });
  }, 3000);

  setTimeout(() => {
    order.status = 'delivering';
    io.emit(`order:${order.id}`, { status: order.status });
    startDeliverySimulation(order);
  }, 8000);
});

function startDeliverySimulation(order: Order) {
  const startX = 0;
  const startY = 0;
  const endX = order.deliveryInfo.gridX;
  const endY = order.deliveryInfo.gridY;

  let currentX = startX;
  let currentY = startY;
  const path: { x: number; y: number }[] = [];

  while (currentX !== endX) {
    currentX += currentX < endX ? 1 : -1;
    path.push({ x: currentX, y: currentY });
  }
  while (currentY !== endY) {
    currentY += currentY < endY ? 1 : -1;
    path.push({ x: currentX, y: currentY });
  }

  let step = 0;
  const visited: { x: number; y: number }[] = [{ x: startX, y: startY }];

  const interval = setInterval(() => {
    if (step >= path.length) {
      clearInterval(interval);
      io.emit(`order:${order.id}:arrived`, { delivered: true });
      return;
    }

    const pos = path[step];
    order.deliveryPersonPosition = pos;
    visited.push(pos);
    io.emit(`order:${order.id}:position`, { position: pos, path: visited });
    step++;
  }, 2000);
}

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  socket.on('order:subscribe', (orderId: number) => {
    socket.join(`order:${orderId}`);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      socket.emit(`order:${orderId}`, { status: order.status });
      if (order.deliveryPersonPosition) {
        socket.emit(`order:${orderId}:position`, {
          position: order.deliveryPersonPosition,
          path: [order.deliveryPersonPosition],
        });
      }
    }
  });

  socket.on('order:confirmDelivery', (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'delivered';
      io.emit(`order:${orderId}`, { status: order.status });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Flower shop server running on port ${PORT}`);
});
