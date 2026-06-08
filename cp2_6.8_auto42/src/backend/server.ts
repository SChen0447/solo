import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

export interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  category: 'math' | 'programming' | 'design';
  color: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  style: 'solid' | 'dashed';
  label: string;
}

let nodes: GraphNode[] = [];
let edges: GraphEdge[] = [];
let nodeIdCounter = 1;
let edgeIdCounter = 1;

app.get('/api/nodes', (_req, res) => {
  res.json(nodes);
});

app.get('/api/edges', (_req, res) => {
  res.json(edges);
});

app.post('/api/nodes', (req, res) => {
  const { title, x, y, category = 'programming', color } = req.body;
  const newNode: GraphNode = {
    id: `node_${nodeIdCounter++}`,
    title: title || '新节点',
    x: x ?? 100,
    y: y ?? 100,
    category,
    color: color || getCategoryColor(category),
  };
  nodes.push(newNode);
  res.status(201).json(newNode);
});

app.put('/api/nodes/:id', (req, res) => {
  const { id } = req.params;
  const nodeIndex = nodes.findIndex((n) => n.id === id);
  if (nodeIndex === -1) {
    res.status(404).json({ error: '节点不存在' });
    return;
  }
  nodes[nodeIndex] = { ...nodes[nodeIndex], ...req.body };
  res.json(nodes[nodeIndex]);
});

app.delete('/api/nodes/:id', (req, res) => {
  const { id } = req.params;
  const nodeIndex = nodes.findIndex((n) => n.id === id);
  if (nodeIndex === -1) {
    res.status(404).json({ error: '节点不存在' });
    return;
  }
  nodes.splice(nodeIndex, 1);
  edges = edges.filter((e) => e.source !== id && e.target !== id);
  res.json({ success: true });
});

app.post('/api/edges', (req, res) => {
  const { source, target, style = 'solid', label = '' } = req.body;
  if (!source || !target) {
    res.status(400).json({ error: '源节点和目标节点必填' });
    return;
  }
  const exists = edges.some((e) => e.source === source && e.target === target);
  if (exists) {
    res.status(409).json({ error: '依赖关系已存在' });
    return;
  }
  const newEdge: GraphEdge = {
    id: `edge_${edgeIdCounter++}`,
    source,
    target,
    style,
    label,
  };
  edges.push(newEdge);
  res.status(201).json(newEdge);
});

app.put('/api/edges/:id', (req, res) => {
  const { id } = req.params;
  const edgeIndex = edges.findIndex((e) => e.id === id);
  if (edgeIndex === -1) {
    res.status(404).json({ error: '边不存在' });
    return;
  }
  edges[edgeIndex] = { ...edges[edgeIndex], ...req.body };
  res.json(edges[edgeIndex]);
});

app.delete('/api/edges/:id', (req, res) => {
  const { id } = req.params;
  const edgeIndex = edges.findIndex((e) => e.id === id);
  if (edgeIndex === -1) {
    res.status(404).json({ error: '边不存在' });
    return;
  }
  edges.splice(edgeIndex, 1);
  res.json({ success: true });
});

app.get('/api/topology', (_req, res) => {
  const result = kahnTopologicalSort(nodes, edges);
  res.json(result);
});

interface TopologyResult {
  order: string[];
  hasCycle: boolean;
  cycleNodes: string[];
  layers: string[][];
}

function kahnTopologicalSort(
  nodeList: GraphNode[],
  edgeList: GraphEdge[]
): TopologyResult {
  const inDegree: Map<string, number> = new Map();
  const adjacency: Map<string, string[]> = new Map();

  nodeList.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  edgeList.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  const order: string[] = [];
  const layers: string[][] = [];

  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLayer: string[] = [];

    for (let i = 0; i < levelSize; i++) {
      const current = queue.shift()!;
      order.push(current);
      currentLayer.push(current);

      const neighbors = adjacency.get(current) || [];
      neighbors.forEach((neighbor) => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    if (currentLayer.length > 0) {
      layers.push(currentLayer);
    }
  }

  const hasCycle = order.length !== nodeList.length;
  const cycleNodes: string[] = [];

  if (hasCycle) {
    inDegree.forEach((degree, nodeId) => {
      if (degree > 0) {
        cycleNodes.push(nodeId);
      }
    });
  }

  return { order, hasCycle, cycleNodes, layers };
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    math: '#4a90d9',
    programming: '#4ab97a',
    design: '#e8a849',
  };
  return colors[category] || '#4ab97a';
}

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
