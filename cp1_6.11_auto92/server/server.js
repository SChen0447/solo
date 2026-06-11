const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const graph = {
  nodes: [],
  edges: [],
};

const cursors = {};

app.get('/api/nodes', (req, res) => {
  res.json(graph.nodes);
});

app.post('/api/nodes', (req, res) => {
  const node = {
    id: req.body.id || uuidv4(),
    title: req.body.title || 'New Node',
    description: req.body.description || '',
    type: req.body.type || 'concept',
    color: req.body.color || '#7fb5b5',
    x: req.body.x ?? 0,
    y: req.body.y ?? 0,
    links: req.body.links || [],
    createdAt: Date.now(),
  };
  graph.nodes.push(node);
  res.json(node);
});

app.put('/api/nodes/:id', (req, res) => {
  const idx = graph.nodes.findIndex((n) => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Node not found' });
  graph.nodes[idx] = { ...graph.nodes[idx], ...req.body, id: req.params.id };
  res.json(graph.nodes[idx]);
});

app.delete('/api/nodes/:id', (req, res) => {
  const idx = graph.nodes.findIndex((n) => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Node not found' });
  graph.nodes.splice(idx, 1);
  graph.edges = graph.edges.filter(
    (e) => e.source !== req.params.id && e.target !== req.params.id
  );
  res.json({ success: true });
});

app.get('/api/edges', (req, res) => {
  res.json(graph.edges);
});

app.post('/api/edges', (req, res) => {
  const edge = {
    id: req.body.id || uuidv4(),
    source: req.body.source,
    target: req.body.target,
    label: req.body.label || '',
    createdAt: Date.now(),
  };
  graph.edges.push(edge);
  res.json(edge);
});

app.put('/api/edges/:id', (req, res) => {
  const idx = graph.edges.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Edge not found' });
  graph.edges[idx] = { ...graph.edges[idx], ...req.body, id: req.params.id };
  res.json(graph.edges[idx]);
});

app.delete('/api/edges/:id', (req, res) => {
  const idx = graph.edges.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Edge not found' });
  graph.edges.splice(idx, 1);
  res.json({ success: true });
});

app.get('/api/graph', (req, res) => {
  res.json({ nodes: graph.nodes, edges: graph.edges });
});

io.on('connection', (socket) => {
  const userId = uuidv4();
  const userName = `User-${userId.slice(0, 4)}`;
  const userColor = `hsl(${Math.random() * 360}, 70%, 60%)`;

  socket.emit('init', { nodes: graph.nodes, edges: graph.edges, userId, userName, userColor });

  socket.on('cursor-move', (data) => {
    cursors[userId] = { ...data, name: userName, color: userColor };
    socket.broadcast.emit('cursor-update', cursors[userId]);
  });

  socket.on('node-create', (node) => {
    const existing = graph.nodes.find((n) => n.id === node.id);
    if (!existing) {
      graph.nodes.push(node);
      socket.broadcast.emit('node-created', node);
    }
  });

  socket.on('node-update', (node) => {
    const idx = graph.nodes.findIndex((n) => n.id === node.id);
    if (idx !== -1) {
      graph.nodes[idx] = { ...graph.nodes[idx], ...node };
      socket.broadcast.emit('node-updated', graph.nodes[idx]);
    }
  });

  socket.on('node-move', (data) => {
    const idx = graph.nodes.findIndex((n) => n.id === data.id);
    if (idx !== -1) {
      graph.nodes[idx].x = data.x;
      graph.nodes[idx].y = data.y;
      socket.broadcast.emit('node-moved', data);
    }
  });

  socket.on('node-delete', (id) => {
    const idx = graph.nodes.findIndex((n) => n.id === id);
    if (idx !== -1) {
      graph.nodes.splice(idx, 1);
      graph.edges = graph.edges.filter((e) => e.source !== id && e.target !== id);
      socket.broadcast.emit('node-deleted', id);
    }
  });

  socket.on('edge-create', (edge) => {
    const existing = graph.edges.find((e) => e.id === edge.id);
    if (!existing) {
      graph.edges.push(edge);
      socket.broadcast.emit('edge-created', edge);
    }
  });

  socket.on('edge-update', (edge) => {
    const idx = graph.edges.findIndex((e) => e.id === edge.id);
    if (idx !== -1) {
      graph.edges[idx] = { ...graph.edges[idx], ...edge };
      socket.broadcast.emit('edge-updated', graph.edges[idx]);
    }
  });

  socket.on('edge-delete', (id) => {
    const idx = graph.edges.findIndex((e) => e.id === id);
    if (idx !== -1) {
      graph.edges.splice(idx, 1);
      socket.broadcast.emit('edge-deleted', id);
    }
  });

  socket.on('disconnect', () => {
    delete cursors[userId];
    socket.broadcast.emit('cursor-remove', userId);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Knowledge Galaxy server running on port ${PORT}`);
});
