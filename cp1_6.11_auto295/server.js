import express from 'express';
import cors from 'cors';

const SPICES = [
  { id: 'cinnamon', name: '肉桂', basePrice: 12, quality: 'A', perishIndex: 0.02 },
  { id: 'pepper', name: '胡椒', basePrice: 8, quality: 'B', perishIndex: 0.01 },
  { id: 'cloves', name: '丁香', basePrice: 18, quality: 'A', perishIndex: 0.015 },
  { id: 'nutmeg', name: '肉豆蔻', basePrice: 15, quality: 'B', perishIndex: 0.025 },
  { id: 'saffron', name: '藏红花', basePrice: 50, quality: 'A', perishIndex: 0.03 }
];

const PORTS_DATA = [
  { id: 'venice', name: '威尼斯', lat: 45.4408, lng: 12.3155, security: 85 },
  { id: 'alexandria', name: '亚历山大', lat: 31.2001, lng: 29.9187, security: 70 },
  { id: 'aden', name: '亚丁', lat: 12.7851, lng: 45.0360, security: 50 },
  { id: 'muscat', name: '马斯喀特', lat: 23.5880, lng: 58.3829, security: 55 },
  { id: 'hormuz', name: '霍尔木兹', lat: 27.1467, lng: 56.8330, security: 60 },
  { id: 'calicut', name: '卡利卡特', lat: 11.2588, lng: 75.7804, security: 65 },
  { id: 'cochin', name: '科钦', lat: 9.9312, lng: 76.2673, security: 68 },
  { id: 'malacca', name: '马六甲', lat: 2.1896, lng: 102.2501, security: 72 },
  { id: 'zanzibar', name: '桑给巴尔', lat: -6.1630, lng: 39.2026, security: 45 },
  { id: 'constantinople', name: '君士坦丁堡', lat: 41.0082, lng: 28.9784, security: 75 }
];

const QUARTER_ROUNDS = 12;
let currentRound = 1;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;

const generateInventory = () => {
  const inv = {};
  for (const spice of SPICES) {
    inv[spice.id] = randomInt(30, 100);
  }
  return inv;
};

const ports = PORTS_DATA.map(port => ({
  ...port,
  inventory: generateInventory()
}));

const priceHistory = {};

const calculatePrice = (spice, port, round) => {
  const demand = 50 + (round % 6) * 10;
  const inventory = port.inventory[spice.id] || 0;
  const base = spice.basePrice;
  const demandFactor = 1 + (demand - inventory) / 200;
  const randomFactor = 1 + randomFloat(-0.1, 0.1);
  return Math.max(1, Math.round(base * demandFactor * randomFactor));
};

const getCurrentPrices = (port, round) => {
  const prices = {};
  for (const spice of SPICES) {
    prices[spice.id] = calculatePrice(spice, port, round);
  }
  return prices;
};

for (const port of ports) {
  for (const spice of SPICES) {
    const key = `${port.id}_${spice.id}`;
    priceHistory[key] = { portId: port.id, spiceId: spice.id, prices: [] };
    for (let r = 1; r <= currentRound; r++) {
      priceHistory[key].prices.push({ round: r, price: calculatePrice(spice, port, r) });
    }
  }
}

const getEvent = () => {
  const r = Math.random();
  if (r < 0.25) return { type: 'pirates', name: '海盗袭击', description: '海盗出没！' };
  if (r < 0.50) return { type: 'storm', name: '海上风暴', description: '遭遇风暴！' };
  if (r < 0.65) return { type: 'surge', name: '突发需求', description: '市场需求激增！' };
  if (r < 0.70) return { type: 'closed', name: '港口关闭', description: '港口临时关闭！' };
  return { type: 'none', name: '平安航行', description: '一路顺风。' };
};

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/ports', (req, res) => {
  const result = ports.map(port => ({
    ...port,
    currentPrices: getCurrentPrices(port, currentRound)
  }));
  res.json(result);
});

app.post('/api/trade', (req, res) => {
  const { departurePortId, arrivalPortId, cargo, round } = req.body;
  const departurePort = ports.find(p => p.id === departurePortId);
  const arrivalPort = ports.find(p => p.id === arrivalPortId);
  
  if (!departurePort || !arrivalPort) {
    return res.status(400).json({ error: '无效的港口ID' });
  }
  
  const numEvents = randomInt(1, 3);
  const events = [];
  let finalCargo = cargo.map(c => ({ ...c }));
  const surgeMultipliers = {};
  
  for (const spice of SPICES) {
    surgeMultipliers[spice.id] = 1;
  }
  
  for (let i = 0; i < numEvents; i++) {
    const event = getEvent();
    events.push(event);
    
    if (event.type === 'pirates') {
      const winRate = departurePort.security / 120;
      if (Math.random() > winRate) {
        const lossRatio = randomFloat(0.3, 0.6);
        finalCargo = finalCargo.map(c => ({
          ...c,
          quantity: Math.max(0, Math.floor(c.quantity * (1 - lossRatio)))
        }));
        event.description = `海盗攻击！战斗失败，损失${Math.round(lossRatio * 100)}%货物。`;
      } else {
        event.description = `海盗攻击！成功击退海盗，货物安然无恙。`;
      }
    } else if (event.type === 'storm') {
      let totalLost = 0;
      const loss = randomInt(5, 15);
      let remaining = loss;
      while (remaining > 0 && finalCargo.some(c => c.quantity > 0)) {
        const idx = randomInt(0, finalCargo.length - 1);
        if (finalCargo[idx].quantity > 0) {
          finalCargo[idx].quantity -= 1;
          remaining -= 1;
          totalLost += 1;
        }
      }
      event.description = `遭遇风暴，损失${totalLost}单位货物。`;
    } else if (event.type === 'surge') {
      const numSurge = randomInt(1, 2);
      const selected = [...SPICES].sort(() => Math.random() - 0.5).slice(0, numSurge);
      const surgedSpices = [];
      for (const s of selected) {
        const mult = randomInt(3, 5);
        surgeMultipliers[s.id] = Math.max(surgeMultipliers[s.id], mult);
        surgedSpices.push(`${s.name}x${mult}`);
      }
      event.description = `突发需求！${surgedSpices.join('、')}价格暴涨！`;
    } else if (event.type === 'closed') {
      const delay = randomInt(1, 2);
      event.description = `港口临时关闭，延误${delay}轮。`;
    }
  }
  
  for (const item of cargo) {
    departurePort.inventory[item.spiceId] += item.quantity;
  }
  
  const sellPrices = {};
  for (const spice of SPICES) {
    const base = calculatePrice(spice, arrivalPort, round);
    sellPrices[spice.id] = Math.round(base * surgeMultipliers[spice.id]);
  }
  
  let totalRevenue = 0;
  let totalCost = 0;
  
  for (const item of finalCargo) {
    const sellPrice = sellPrices[item.spiceId];
    totalRevenue += item.quantity * sellPrice;
    arrivalPort.inventory[item.spiceId] -= item.quantity;
  }
  
  for (const item of cargo) {
    totalCost += item.quantity * item.buyPrice;
  }
  
  const totalProfit = totalRevenue - totalCost;
  
  const usedRound = round || currentRound;
  for (const spice of SPICES) {
    const key = `${arrivalPort.id}_${spice.id}`;
    const price = sellPrices[spice.id];
    const existing = priceHistory[key].prices.find(p => p.round === usedRound);
    if (existing) {
      existing.price = price;
    } else {
      priceHistory[key].prices.push({ round: usedRound, price });
    }
  }
  
  currentRound = Math.max(currentRound, usedRound + 1);
  
  res.json({
    departurePort: { id: departurePort.id, name: departurePort.name },
    arrivalPort: { id: arrivalPort.id, name: arrivalPort.name },
    round: usedRound,
    events,
    originalCargo: cargo,
    finalCargo,
    sellPrices,
    totalRevenue,
    totalCost,
    totalProfit
  });
});

app.get('/api/prices', (req, res) => {
  res.json(Object.values(priceHistory));
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`香料贸易服务器运行在 http://localhost:${PORT}`);
});
