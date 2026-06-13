import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  username: string;
  password: string;
}

interface Plant {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  createdAtDate: number;
}

interface PlantRecord {
  id: string;
  plantId: string;
  userId: string;
  date: string;
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  humidity: number;
}

const app = express();
const PORT = 3001;
const JWT_SECRET = 'guangzhi-vein-weather-secret';

app.use(cors());
app.use(express.json());

const users: User[] = [];
const plants: Plant[] = [];
const records: PlantRecord[] = [];

const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const user: User = {
    id: uuidv4(),
    username,
    password,
  };

  users.push(user);

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/plants', authenticateToken, (req, res) => {
  const userId = (req as any).userId;
  const userPlants = plants.filter((p) => p.userId === userId);
  res.json(userPlants);
});

app.post('/api/plants', authenticateToken, (req, res) => {
  const userId = (req as any).userId;
  const { name } = req.body;

  const userPlantsCount = plants.filter((p) => p.userId === userId).length;
  if (userPlantsCount >= 6) {
    return res.status(400).json({ error: 'Maximum 6 plants allowed' });
  }

  const plant: Plant = {
    id: uuidv4(),
    userId,
    name,
    createdAt: new Date().toISOString(),
    createdAtDate: Date.now(),
  };

  plants.push(plant);
  res.json(plant);
});

app.get('/api/plants/:plantId/records', authenticateToken, (req, res) => {
  const userId = (req as any).userId;
  const { plantId } = req.params;

  const plantRecords = records.filter(
    (r) => r.plantId === plantId && r.userId === userId
  );

  plantRecords.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  res.json(plantRecords);
});

app.post('/api/plants/:plantId/records', authenticateToken, (req, res) => {
  const userId = (req as any).userId;
  const { plantId } = req.params;
  const { weather, humidity, date } = req.body;

  const record: PlantRecord = {
    id: uuidv4(),
    plantId,
    userId,
    date: date || new Date().toISOString().split('T')[0],
    weather,
    humidity,
  };

  records.push(record);
  res.json(record);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
