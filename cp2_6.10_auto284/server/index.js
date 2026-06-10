import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, subDays, parseISO, isWithinInterval, startOfDay } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, '..', 'data');

app.use(cors());
app.use(express.json());

const readJSON = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const writeJSON = (filename, data) => {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const getIngredientById = (id) => {
  const { ingredients } = readJSON('recipes.json');
  return ingredients.find((i) => i.id === id);
};

const getRecipeById = (id) => {
  const { recipes } = readJSON('recipes.json');
  return recipes.find((r) => r.id === id);
};

const calculateRecipeCost = (recipe) => {
  const { ingredients } = readJSON('recipes.json');
  let totalCost = 0;
  const ingredientDetails = recipe.ingredients.map((ri) => {
    const ing = ingredients.find((i) => i.id === ri.ingredientId);
    const cost = ing ? ing.costPerUnit * ri.amount : 0;
    totalCost += cost;
    return {
      ...ing,
      amount: ri.amount,
      ingredientCost: cost,
    };
  });
  const unitCost = recipe.estimatedYield > 0 ? totalCost / recipe.estimatedYield : 0;
  return { totalCost, unitCost, ingredientDetails };
};

const checkIngredientAvailability = (recipeId, quantity) => {
  const recipe = getRecipeById(recipeId);
  const { ingredients } = readJSON('recipes.json');
  const shortages = [];

  recipe.ingredients.forEach((ri) => {
    const ing = ingredients.find((i) => i.id === ri.ingredientId);
    const needed = ri.amount * quantity;
    if (ing && ing.stock < needed) {
      shortages.push({
        name: ing.name,
        needed: Number(needed.toFixed(2)),
        available: ing.stock,
        unit: ing.unit,
      });
    }
  });

  return shortages;
};

const getNext3DaysOrders = () => {
  const { orders } = readJSON('orders.json');
  const today = startOfDay(new Date());
  const threeDaysLater = addDays(today, 3);

  return orders.filter((o) =>
    isWithinInterval(parseISO(o.pickupDate), {
      start: today,
      end: threeDaysLater,
    })
  );
};

const calculate3DaysDemand = () => {
  const orders = getNext3DaysOrders();
  const { recipes } = readJSON('recipes.json');
  const demand = {};

  orders.forEach((order) => {
    const recipe = recipes.find((r) => r.id === order.recipeId);
    if (recipe) {
      recipe.ingredients.forEach((ri) => {
        if (!demand[ri.ingredientId]) {
          demand[ri.ingredientId] = 0;
        }
        demand[ri.ingredientId] += ri.amount * order.quantity;
      });
    }
  });

  return demand;
};

app.get('/api/recipes', (req, res) => {
  const { recipes } = readJSON('recipes.json');
  const recipesWithCost = recipes.map((recipe) => ({
    ...recipe,
    ...calculateRecipeCost(recipe),
  }));
  res.json(recipesWithCost);
});

app.get('/api/ingredients', (req, res) => {
  const { ingredients } = readJSON('recipes.json');
  res.json(ingredients);
});

app.get('/api/orders', (req, res) => {
  const { orders } = readJSON('orders.json');
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const { recipeId, quantity, pickupDate, customerName, customerPhone } = req.body;

  if (!recipeId || !quantity || !pickupDate || !customerName || !customerPhone) {
    return res.status(400).json({
      success: false,
      error: '请填写所有必填字段',
      shortages: [],
    });
  }

  const shortages = checkIngredientAvailability(recipeId, quantity);
  if (shortages.length > 0) {
    return res.status(400).json({
      success: false,
      error: '原料库存不足',
      shortages,
    });
  }

  const data = readJSON('orders.json');
  const newOrder = {
    id: uuidv4(),
    recipeId,
    quantity,
    pickupDate,
    customerName,
    customerPhone,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  data.orders.push(newOrder);

  const recipeData = readJSON('recipes.json');
  const recipe = getRecipeById(recipeId);
  recipe.ingredients.forEach((ri) => {
    const ingIndex = recipeData.ingredients.findIndex((i) => i.id === ri.ingredientId);
    if (ingIndex !== -1) {
      recipeData.ingredients[ingIndex].stock = Number(
        (recipeData.ingredients[ingIndex].stock - ri.amount * quantity).toFixed(3)
      );
    }
  });

  writeJSON('orders.json', data);
  writeJSON('recipes.json', recipeData);

  res.json({ success: true, order: newOrder });
});

app.get('/api/production-plans', (req, res) => {
  const date = req.query.date || format(new Date(), 'yyyy-MM-dd');
  const { plans } = readJSON('production-plans.json');
  const filtered = plans
    .filter((p) => p.date === date)
    .sort((a, b) => a.order - b.order);
  res.json(filtered);
});

app.put('/api/production-plans/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const data = readJSON('production-plans.json');
  const index = data.plans.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: '生产计划不存在' });
  }

  data.plans[index] = { ...data.plans[index], ...updates };
  writeJSON('production-plans.json', data);

  res.json({ success: true, plan: data.plans[index] });
});

app.put('/api/production-plans/reorder', (req, res) => {
  const { orders } = req.body;
  const data = readJSON('production-plans.json');

  orders.forEach(({ id, order }) => {
    const index = data.plans.findIndex((p) => p.id === id);
    if (index !== -1) {
      data.plans[index].order = order;
    }
  });

  writeJSON('production-plans.json', data);
  res.json({ success: true });
});

app.get('/api/stats/weekly', (req, res) => {
  const { salesHistory } = readJSON('orders.json');
  const { recipes } = readJSON('recipes.json');
  const today = startOfDay(new Date());

  const daily = [];
  let totalRevenue = 0;
  let totalCost = 0;

  for (let i = 6; i >= 0; i--) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    const daySales = salesHistory.filter((s) => s.date === date);
    const salesByRecipe = recipes.map((recipe) => {
      const sale = daySales.find((s) => s.recipeId === recipe.id);
      const quantity = sale ? sale.quantity : 0;
      const returns = sale ? sale.returns : 0;
      const { totalCost: recipeCost } = calculateRecipeCost(recipe);
      totalRevenue += quantity * recipe.sellingPrice;
      totalCost += quantity * recipeCost;
      return {
        recipeId: recipe.id,
        recipeName: recipe.name,
        quantity,
        returns,
      };
    });
    daily.push({ date, sales: salesByRecipe });
  }

  res.json({
    daily,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
  });
});

app.get('/api/inventory/alerts', (req, res) => {
  const { ingredients } = readJSON('recipes.json');
  const alerts = [];
  const suggestions = [];
  const demand = calculate3DaysDemand();

  ingredients.forEach((ing) => {
    if (ing.stock < ing.safetyStock) {
      alerts.push({
        ingredient: ing,
        shortage: Number((ing.safetyStock - ing.stock).toFixed(2)),
      });
    }

    const futureDemand = demand[ing.id] || 0;
    const totalNeeded = futureDemand + ing.safetyStock;
    if (ing.stock < totalNeeded) {
      suggestions.push({
        ingredient: ing,
        recommendedOrder: Number(Math.ceil((totalNeeded - ing.stock) * 100) / 100),
      });
    }
  });

  res.json({ alerts, suggestions });
});

app.listen(PORT, () => {
  console.log(`🍞 面包坊工坊后端服务器运行在 http://localhost:${PORT}`);
});
