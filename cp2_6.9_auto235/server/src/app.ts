import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { format, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

type PlantType = '多肉' | '绿萝' | '虎皮兰' | '龟背竹' | '其他';
type InitialSize = '种子' | '幼苗' | '成株';
type ActionType = '浇水' | '施肥' | '修剪';

interface CareAction {
  id: string;
  type: ActionType;
  date: string;
}

interface Plant {
  id: string;
  name: string;
  type: PlantType;
  initialSize: InitialSize;
  createdAt: string;
  careActions: CareAction[];
}

const plants: Map<string, Plant> = new Map();

function calculateGrowthProgress(plant: Plant): number {
  const daysAlive = Math.max(1, differenceInDays(new Date(), new Date(plant.createdAt)));
  const actionCount = plant.careActions.length;
  
  let baseProgress = 0;
  switch (plant.initialSize) {
    case '种子':
      baseProgress = 5;
      break;
    case '幼苗':
      baseProgress = 35;
      break;
    case '成株':
      baseProgress = 75;
      break;
  }
  
  const progress = Math.min(100, baseProgress + daysAlive * 1.5 + actionCount * 3);
  return Math.floor(progress);
}

function calculateHealthStatus(plant: Plant): 'healthy' | 'neutral' | 'wilting' {
  if (plant.careActions.length === 0) {
    const daysSinceCreation = differenceInDays(new Date(), new Date(plant.createdAt));
    return daysSinceCreation > 7 ? 'wilting' : daysSinceCreation > 3 ? 'neutral' : 'healthy';
  }
  
  const lastAction = plant.careActions[plant.careActions.length - 1];
  const daysSinceLastAction = differenceInDays(new Date(), new Date(lastAction.date));
  
  if (daysSinceLastAction > 10) return 'wilting';
  if (daysSinceLastAction > 5) return 'neutral';
  return 'healthy';
}

app.post('/api/plants', (req, res) => {
  try {
    const { name, type, initialSize } = req.body;
    
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 10) {
      return res.status(400).json({ error: '植物名称必须是1-10个字符' });
    }
    
    const validTypes: PlantType[] = ['多肉', '绿萝', '虎皮兰', '龟背竹', '其他'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: '无效的植物品种' });
    }
    
    const validSizes: InitialSize[] = ['种子', '幼苗', '成株'];
    if (!validSizes.includes(initialSize)) {
      return res.status(400).json({ error: '无效的初始大小' });
    }
    
    const plant: Plant = {
      id: uuidv4(),
      name: name.trim(),
      type,
      initialSize,
      createdAt: new Date().toISOString(),
      careActions: [],
    };
    
    plants.set(plant.id, plant);
    
    return res.status(201).json({
      ...plant,
      healthStatus: calculateHealthStatus(plant),
      lastCareDate: plant.careActions.length > 0 
        ? plant.careActions[plant.careActions.length - 1].date 
        : null,
    });
  } catch (error) {
    return res.status(500).json({ error: '创建植物失败' });
  }
});

app.get('/api/plants', (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    const plantsArray = Array.from(plants.values()).map((plant) => ({
      ...plant,
      healthStatus: calculateHealthStatus(plant),
      lastCareDate: plant.careActions.length > 0 
        ? plant.careActions[plant.careActions.length - 1].date 
        : null,
    }));
    
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pagedPlants = plantsArray.slice(start, end);
    
    return res.json({
      plants: pagedPlants,
      total: plantsArray.length,
      page,
      pageSize,
      hasMore: end < plantsArray.length,
    });
  } catch (error) {
    return res.status(500).json({ error: '获取植物列表失败' });
  }
});

app.post('/api/plants/:id/action', (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    
    const plant = plants.get(id);
    if (!plant) {
      return res.status(404).json({ error: '植物不存在' });
    }
    
    const validActions: ActionType[] = ['浇水', '施肥', '修剪'];
    if (!validActions.includes(type)) {
      return res.status(400).json({ error: '无效的养护动作' });
    }
    
    const action: CareAction = {
      id: uuidv4(),
      type,
      date: new Date().toISOString(),
    };
    
    plant.careActions.push(action);
    
    return res.status(201).json({
      ...plant,
      healthStatus: calculateHealthStatus(plant),
      lastCareDate: action.date,
    });
  } catch (error) {
    return res.status(500).json({ error: '记录养护动作失败' });
  }
});

app.get('/api/plants/:id/growth', (req, res) => {
  try {
    const { id } = req.params;
    
    const plant = plants.get(id);
    if (!plant) {
      return res.status(404).json({ error: '植物不存在' });
    }
    
    const growthProgress = calculateGrowthProgress(plant);
    const healthStatus = calculateHealthStatus(plant);
    
    return res.json({
      plantId: id,
      growthProgress,
      healthStatus,
      initialSize: plant.initialSize,
      careActions: plant.careActions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    });
  } catch (error) {
    return res.status(500).json({ error: '获取生长数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`植物日记后端服务已启动: http://localhost:${PORT}`);
});
