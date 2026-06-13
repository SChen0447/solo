import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: boolean;
  description: string;
  image: string;
  colors: string[];
  stitchColors: string[];
}

interface Order {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  color: string;
  stitchColor: string;
  engraving: string;
  quantity: number;
  price: number;
  status: 'pending' | 'making' | 'completed' | 'shipped';
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

const products: Product[] = [
  {
    id: '1',
    name: '经典手工短款钱包',
    category: 'wallet',
    price: 368,
    stock: true,
    description: '采用意大利进口头层植鞣牛皮，手工缝制，每一针每一线都凝聚匠人心血。随着使用时间的推移，皮革会逐渐呈现出独特的包浆质感，成为专属于你的岁月印记。内部设有3个卡位、1个钞位和1个零钱袋，简约而实用。',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  },
  {
    id: '2',
    name: '复古通勤背包',
    category: 'backpack',
    price: 899,
    stock: true,
    description: '全粒面牛皮打造的复古背包，简约大方的设计适合日常通勤和短途出行。主仓可容纳14寸笔记本电脑，前置拉链口袋方便放置小物件。背部透气垫设计，背负更舒适。手工缝制的肩带可自由调节长度。',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  },
  {
    id: '3',
    name: '手工雕花皮带',
    category: 'belt',
    price: 258,
    stock: true,
    description: '甄选优质牛皮，手工雕花装饰，每一道花纹都是匠人手工雕刻而成。纯铜针扣，复古质感十足。皮带宽度3.8cm，适合搭配牛仔裤和休闲裤。可根据腰围定制长度。',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  },
  {
    id: '4',
    name: '编织皮革手环',
    category: 'bracelet',
    price: 128,
    stock: false,
    description: '采用传统编织工艺，将柔软的皮条编织成独特的纹理。纯银搭扣，低调奢华。男女同款，可作为情侣手链佩戴。随着佩戴时间增长，皮革会越来越贴合手腕，呈现独特的个人光泽。',
    image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  },
  {
    id: '5',
    name: '复古铜扣钥匙扣',
    category: 'keychain',
    price: 68,
    stock: true,
    description: '小巧精致的皮革钥匙扣，实用与美观兼具。手工缝制边缘，黄铜钥匙圈历经岁月会呈现迷人的包浆。可烫印个性化字母，成为专属你的小物件。',
    image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  },
  {
    id: '6',
    name: '长款手拿钱包',
    category: 'wallet',
    price: 498,
    stock: true,
    description: '优雅长款设计，大容量收纳。8个卡位、2个钞位、1个拉链零钱袋。采用蜡线手工缝制，经久耐用。手拿设计，既可作钱包也可作小手拿包使用。',
    image: 'https://images.unsplash.com/photo-1625050252780-702416420b31?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  },
  {
    id: '7',
    name: '迷你斜挎包',
    category: 'backpack',
    price: 328,
    stock: true,
    description: '复古风迷你斜挎包，可爱又实用。可放置手机、口红、钥匙等小物。可调节肩带，可斜挎可单肩。简约圆润的造型，百搭各种穿搭风格。',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  },
  {
    id: '8',
    name: '简约针扣皮带',
    category: 'belt',
    price: 198,
    stock: true,
    description: '简约百搭款式，适合商务休闲多种场合。整张牛皮切割，无夹层不拼接。合金针扣，耐用且不易过敏。带宽3.4cm，标准七孔设计。',
    image: 'https://images.unsplash.com/photo-1607706189992-e5239a17d748?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  },
  {
    id: '9',
    name: '双层皮手环',
    category: 'bracelet',
    price: 158,
    stock: true,
    description: '双层皮革设计，更具层次感。磁吸扣设计，佩戴方便。柔软皮革贴合肌肤，舒适不勒。日常搭配的点睛之笔。',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  },
  {
    id: '10',
    name: '铃铛钥匙扣',
    category: 'keychain',
    price: 88,
    stock: true,
    description: '可爱的小铃铛装饰，清脆悦耳。皮革部分采用手工封边工艺，光滑圆润。黄铜铃铛声音清脆响亮。挂在包上或钥匙上都是可爱的点缀。',
    image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=600',
    colors: ['原色植鞣', '深棕', '酒红', '墨绿'],
    stitchColors: ['白', '米黄', '深棕']
  }
];

const orders: Order[] = [
  {
    id: 'ORD001',
    productId: '1',
    productName: '经典手工短款钱包',
    customerName: '张三',
    customerEmail: 'zhangsan@example.com',
    color: '深棕',
    stitchColor: '米黄',
    engraving: 'Z.S.',
    quantity: 1,
    price: 368,
    status: 'making',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'ORD002',
    productId: '2',
    productName: '复古通勤背包',
    customerName: '李四',
    customerEmail: 'lisi@example.com',
    color: '原色植鞣',
    stitchColor: '深棕',
    engraving: '',
    quantity: 1,
    price: 899,
    status: 'pending',
    createdAt: '2024-01-16T14:20:00Z'
  }
];

const users: User[] = [
  {
    id: '1',
    name: '管理员',
    email: 'admin@example.com',
    password: 'admin123',
    isAdmin: true
  }
];

app.get('/api/products', (req: Request, res: Response) => {
  const { category, search, minPrice, maxPrice } = req.query;
  let filtered = [...products];

  if (category && category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }

  if (search) {
    const keyword = String(search).toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(keyword));
  }

  if (minPrice) {
    filtered = filtered.filter(p => p.price >= Number(minPrice));
  }

  if (maxPrice) {
    filtered = filtered.filter(p => p.price <= Number(maxPrice));
  }

  res.json(filtered);
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ message: '产品不存在' });
  }
  res.json(product);
});

app.get('/api/orders', (req: Request, res: Response) => {
  res.json(orders);
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ message: '订单不存在' });
  }
  res.json(order);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { productId, productName, customerName, customerEmail, color, stitchColor, engraving, quantity, price } = req.body;
  
  const newOrder: Order = {
    id: 'ORD' + String(orders.length + 1).padStart(3, '0'),
    productId,
    productName,
    customerName,
    customerEmail,
    color,
    stitchColor,
    engraving,
    quantity,
    price,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  orders.unshift(newOrder);
  res.status(201).json(newOrder);
});

app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ message: '订单不存在' });
  }
  
  const { status } = req.body;
  if (!['pending', 'making', 'completed', 'shipped'].includes(status)) {
    return res.status(400).json({ message: '无效的订单状态' });
  }
  
  order.status = status;
  res.json(order);
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: '请填写完整信息' });
  }
  
  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(400).json({ message: '该邮箱已被注册' });
  }
  
  const newUser: User = {
    id: uuidv4(),
    name,
    email,
    password,
    isAdmin: false
  };
  
  users.push(newUser);
  res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email, isAdmin: newUser.isAdmin });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: '邮箱或密码错误' });
  }
  
  res.json({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
