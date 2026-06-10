const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.warn('better-sqlite3 not available, using in-memory storage');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(express.json());

const PORT = process.env.PORT || 3001;

let db = null;
if (Database) {
  try {
    db = new Database('pet_barista.db');
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT UNIQUE,
        coins INTEGER DEFAULT 500,
        total_satisfaction INTEGER DEFAULT 0,
        day INTEGER DEFAULT 1,
        has_auto_steamer INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY,
        player_id TEXT,
        name TEXT,
        type TEXT,
        agility INTEGER,
        focus INTEGER,
        skill_espresso INTEGER DEFAULT 0,
        skill_latte_art INTEGER DEFAULT 0,
        skill_pour_over INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized successfully');
  } catch (e) {
    console.warn('Failed to initialize database:', e.message);
    db = null;
  }
}

const tables = [
  { id: 'table-0', status: 'empty', customerId: null, x: 500, y: 150, waitTime: 0, maxWaitTime: 20 },
  { id: 'table-1', status: 'empty', customerId: null, x: 700, y: 150, waitTime: 0, maxWaitTime: 20 },
  { id: 'table-2', status: 'empty', customerId: null, x: 500, y: 320, waitTime: 0, maxWaitTime: 20 },
  { id: 'table-3', status: 'empty', customerId: null, x: 700, y: 320, waitTime: 0, maxWaitTime: 20 },
];

const customerNames = [
  '小明', '小红', '阿强', '小丽', '大伟', '小芳', '阿杰', '小雅',
  '老王', '小张', '阿珍', '小李', '大壮', '小美', '阿龙', '小雪',
];
const customerAvatars = [
  '🧑', '👩', '👨', '👧', '👦', '🧔', '👵', '👴',
  '👩‍🦰', '👨‍🦱', '👩‍🦳', '🧑‍🎓', '👨‍💼', '👩‍🍳', '🧙', '🧝',
];
const drinkIds = ['espresso', 'americano', 'cappuccino', 'latte'];

function generateCustomer() {
  return {
    id: Math.random().toString(36).substring(2, 11),
    name: customerNames[Math.floor(Math.random() * customerNames.length)],
    avatar: customerAvatars[Math.floor(Math.random() * customerAvatars.length)],
    drinkId: drinkIds[Math.floor(Math.random() * drinkIds.length)],
    currentStep: 0,
    timeLeft: 20,
    totalTime: 20,
    tableId: null,
    isAngry: false,
    isHappy: false,
  };
}

app.get('/api/pets', (req, res) => {
  if (db) {
    try {
      const pets = db.prepare('SELECT * FROM pets').all();
      res.json(pets);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json([]);
  }
});

app.post('/api/pets', (req, res) => {
  const pet = req.body;
  if (db) {
    try {
      const stmt = db.prepare(`
        INSERT INTO pets (id, player_id, name, type, agility, focus, skill_espresso, skill_latte_art, skill_pour_over)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        pet.id,
        pet.playerId || 'default',
        pet.name,
        pet.type,
        pet.agility,
        pet.focus,
        pet.skills?.espresso || 0,
        pet.skills?.latteArt || 0,
        pet.skills?.pourOver || 0
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json({ success: true });
  }
});

app.post('/api/progress/save', (req, res) => {
  const { coins, totalSatisfaction, day, hasAutoSteamer, playerId = 'default' } = req.body;
  if (db) {
    try {
      const stmt = db.prepare(`
        INSERT INTO game_progress (player_id, coins, total_satisfaction, day, has_auto_steamer, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(player_id) DO UPDATE SET
          coins = excluded.coins,
          total_satisfaction = excluded.total_satisfaction,
          day = excluded.day,
          has_auto_steamer = excluded.has_auto_steamer,
          updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(playerId, coins, totalSatisfaction, day, hasAutoSteamer ? 1 : 0);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json({ success: true });
  }
});

app.get('/api/progress', (req, res) => {
  const playerId = req.query.playerId || 'default';
  if (db) {
    try {
      const progress = db.prepare('SELECT * FROM game_progress WHERE player_id = ?').get(playerId);
      res.json(progress || null);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json(null);
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('tableStatusUpdate', tables);

  socket.on('updateTableStatus', (tableData) => {
    const tableIndex = tables.findIndex(t => t.id === tableData.id);
    if (tableIndex !== -1) {
      tables[tableIndex] = { ...tables[tableIndex], ...tableData };
      io.emit('tableStatusUpdate', tables);
    }
  });

  socket.on('recruitPet', (petData) => {
    io.emit('petRecruited', petData);
  });

  socket.on('customerServed', (data) => {
    io.emit('customerServedBroadcast', data);
  });

  const customerInterval = setInterval(() => {
    if (Math.random() < 0.3) {
      const customer = generateCustomer();
      socket.emit('newCustomerFromServer', customer);
    }
  }, 15000);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(customerInterval);
  });
});

setInterval(() => {
  io.emit('tableStatusUpdate', tables);
}, 2000);

server.listen(PORT, () => {
  console.log(`☕ Pet Barista Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time updates`);
});
