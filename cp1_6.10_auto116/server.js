import express from 'express';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

const MAX_HISTORY = 100;
const USER_COLORS = [
  '#ff7043', '#66bb6a', '#42a5f5', '#ab47bc',
  '#ffa726', '#26c6da', '#ec407a', '#78909c',
  '#5c6bc0', '#26a69a', '#ef5350', '#9ccc65'
];
const USER_NAMES = ['用户A', '用户B', '用户C', '用户D', '用户E', '用户F', '用户G', '用户H'];

let sharedDocument = {
  ingredients: [
    { id: uuidv4(), name: '鸡蛋', quantity: 3, unit: '个', checked: false },
    { id: uuidv4(), name: '面粉', quantity: 200, unit: '克', checked: false },
    { id: uuidv4(), name: '牛奶', quantity: 150, unit: '毫升', checked: false },
    { id: uuidv4(), name: '白糖', quantity: 50, unit: '克', checked: false }
  ],
  steps: [
    { id: uuidv4(), order: 1, content: '将鸡蛋打入碗中，加入白糖搅拌均匀。' },
    { id: uuidv4(), order: 2, content: '筛入面粉，轻轻翻拌至无颗粒。' },
    { id: uuidv4(), order: 3, content: '倒入牛奶，搅拌成顺滑的面糊。' },
    { id: uuidv4(), order: 4, content: '平底锅加热，倒入适量面糊，小火煎至两面金黄。' }
  ]
};

let versionHistory = [];
let connectedClients = new Map();

function saveVersion(userId, userName, userColor, summary) {
  const snapshot = JSON.parse(JSON.stringify(sharedDocument));
  const version = {
    id: uuidv4(),
    userId,
    userName,
    userColor,
    timestamp: Date.now(),
    summary,
    snapshot
  };
  versionHistory.unshift(version);
  if (versionHistory.length > MAX_HISTORY) {
    versionHistory = versionHistory.slice(0, MAX_HISTORY);
  }
  return version;
}

function broadcast(message, excludeId = null) {
  const data = JSON.stringify(message);
  connectedClients.forEach((client, id) => {
    if (id !== excludeId && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  });
}

function broadcastOnlineCount() {
  broadcast({
    type: 'online_count',
    count: connectedClients.size
  });
}

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  const userIndex = connectedClients.size % USER_NAMES.length;
  const user = {
    id: clientId,
    name: USER_NAMES[userIndex],
    color: USER_COLORS[userIndex]
  };
  connectedClients.set(clientId, { ws, user });

  ws.send(JSON.stringify({
    type: 'init',
    clientId,
    user,
    document: sharedDocument,
    history: versionHistory,
    onlineCount: connectedClients.size
  }));

  broadcastOnlineCount();

  broadcast({
    type: 'user_joined',
    user,
    onlineCount: connectedClients.size
  }, clientId);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const clientInfo = connectedClients.get(clientId);
      if (!clientInfo) return;

      switch (msg.type) {
        case 'ingredient_update': {
          const { id, changes } = msg;
          const idx = sharedDocument.ingredients.findIndex(i => i.id === id);
          if (idx !== -1) {
            sharedDocument.ingredients[idx] = { ...sharedDocument.ingredients[idx], ...changes };
            const old = sharedDocument.ingredients[idx];
            let summary = `${clientInfo.user.name} `;
            if (changes.name !== undefined) summary += `修改了食材为 ${changes.name}`;
            else if (changes.quantity !== undefined) summary += `修改了 ${old.name} 数量为 ${changes.quantity}${old.unit || ''}`;
            else if (changes.checked !== undefined) summary += `${changes.checked ? '勾选' : '取消勾选'}了 ${old.name}`;
            else summary += `更新了 ${old.name}`;
            
            saveVersion(clientInfo.user.id, clientInfo.user.name, clientInfo.user.color, summary);
            broadcast({ type: 'ingredient_update', id, changes, updatedBy: clientInfo.user.name }, clientId);
          }
          break;
        }
        case 'ingredient_add': {
          const ingredient = { ...msg.ingredient, id: uuidv4() };
          sharedDocument.ingredients.push(ingredient);
          const summary = `${clientInfo.user.name} 增加了 ${ingredient.quantity || 1}${ingredient.unit || ''} ${ingredient.name}`;
          saveVersion(clientInfo.user.id, clientInfo.user.name, clientInfo.user.color, summary);
          broadcast({ type: 'ingredient_add', ingredient, updatedBy: clientInfo.user.name }, clientId);
          break;
        }
        case 'ingredient_delete': {
          const { id } = msg;
          const idx = sharedDocument.ingredients.findIndex(i => i.id === id);
          if (idx !== -1) {
            const deleted = sharedDocument.ingredients[idx];
            sharedDocument.ingredients.splice(idx, 1);
            const summary = `${clientInfo.user.name} 删除了 ${deleted.name}`;
            saveVersion(clientInfo.user.id, clientInfo.user.name, clientInfo.user.color, summary);
            broadcast({ type: 'ingredient_delete', id, updatedBy: clientInfo.user.name }, clientId);
          }
          break;
        }
        case 'step_update': {
          const { id, changes } = msg;
          const idx = sharedDocument.steps.findIndex(s => s.id === id);
          if (idx !== -1) {
            sharedDocument.steps[idx] = { ...sharedDocument.steps[idx], ...changes };
            const old = sharedDocument.steps[idx];
            let summary = `${clientInfo.user.name} `;
            if (changes.content !== undefined) summary += `修改了步骤 ${old.order}`;
            else summary += `更新了步骤 ${old.order}`;
            saveVersion(clientInfo.user.id, clientInfo.user.name, clientInfo.user.color, summary);
            broadcast({ type: 'step_update', id, changes, updatedBy: clientInfo.user.name }, clientId);
          }
          break;
        }
        case 'step_add': {
          const step = { ...msg.step, id: uuidv4(), order: sharedDocument.steps.length + 1 };
          sharedDocument.steps.push(step);
          const summary = `${clientInfo.user.name} 新增了步骤 ${step.order}`;
          saveVersion(clientInfo.user.id, clientInfo.user.name, clientInfo.user.color, summary);
          broadcast({ type: 'step_add', step, updatedBy: clientInfo.user.name }, clientId);
          break;
        }
        case 'step_delete': {
          const { id } = msg;
          const idx = sharedDocument.steps.findIndex(s => s.id === id);
          if (idx !== -1) {
            const deleted = sharedDocument.steps[idx];
            sharedDocument.steps.splice(idx, 1);
            sharedDocument.steps.forEach((s, i) => s.order = i + 1);
            const summary = `${clientInfo.user.name} 删除了步骤 ${deleted.order}`;
            saveVersion(clientInfo.user.id, clientInfo.user.name, clientInfo.user.color, summary);
            broadcast({ type: 'step_delete', id, updatedBy: clientInfo.user.name }, clientId);
          }
          break;
        }
        case 'step_reorder': {
          const { fromIndex, toIndex } = msg;
          if (fromIndex >= 0 && fromIndex < sharedDocument.steps.length &&
              toIndex >= 0 && toIndex < sharedDocument.steps.length) {
            const [removed] = sharedDocument.steps.splice(fromIndex, 1);
            sharedDocument.steps.splice(toIndex, 0, removed);
            sharedDocument.steps.forEach((s, i) => s.order = i + 1);
            const summary = `${clientInfo.user.name} 调整了步骤顺序`;
            saveVersion(clientInfo.user.id, clientInfo.user.name, clientInfo.user.color, summary);
            broadcast({ type: 'step_reorder', fromIndex, toIndex, updatedBy: clientInfo.user.name }, clientId);
          }
          break;
        }
        case 'rollback': {
          const { versionId } = msg;
          const version = versionHistory.find(v => v.id === versionId);
          if (version) {
            sharedDocument = JSON.parse(JSON.stringify(version.snapshot));
            const summary = `${clientInfo.user.name} 回滚到版本：${version.summary}`;
            saveVersion(clientInfo.user.id, clientInfo.user.name, clientInfo.user.color, summary);
            broadcast({ type: 'rollback', document: sharedDocument, version, updatedBy: clientInfo.user.name });
          }
          break;
        }
      }
    } catch (e) {
      console.error('Message parse error:', e);
    }
  });

  ws.on('close', () => {
    const user = connectedClients.get(clientId)?.user;
    connectedClients.delete(clientId);
    broadcastOnlineCount();
    if (user) {
      broadcast({
        type: 'user_left',
        user,
        onlineCount: connectedClients.size
      });
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', clients: connectedClients.size });
});
