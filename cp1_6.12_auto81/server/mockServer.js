import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const GRID_SIZE = 10;
const ROAD_SPACING = 80;
const DEFAULT_SIGNAL_DURATION = 30;
const INITIAL_VEHICLE_COUNT = 80;

function generateNetwork() {
  const intersections = [];
  const roads = [];

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      intersections.push({
        id: `${x}-${y}`,
        x: x * ROAD_SPACING + 80,
        y: y * ROAD_SPACING + 80,
        gridX: x,
        gridY: y,
      });
    }
  }

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (x < GRID_SIZE - 1) {
        roads.push({
          id: `h-${x}-${y}`,
          from: `${x}-${y}`,
          to: `${x + 1}-${y}`,
          direction: 'horizontal',
        });
      }
      if (y < GRID_SIZE - 1) {
        roads.push({
          id: `v-${x}-${y}`,
          from: `${x}-${y}`,
          to: `${x}-${y + 1}`,
          direction: 'vertical',
        });
      }
    }
  }

  return { intersections, roads };
}

function generateVehicles(network, density = 1) {
  const vehicles = [];
  const { roads, intersections } = network;
  const count = Math.floor(INITIAL_VEHICLE_COUNT * density);

  for (let i = 0; i < count; i++) {
    const road = roads[Math.floor(Math.random() * roads.length)];
    const fromIntersection = intersections.find(int => int.id === road.from);
    const toIntersection = intersections.find(int => int.id === road.to);
    
    const direction = Math.random() > 0.5 ? 1 : -1;
    const progress = Math.random() * 0.6 + 0.2;
    
    let x, y, vx, vy;
    if (road.direction === 'horizontal') {
      const startX = direction === 1 ? fromIntersection.x : toIntersection.x;
      const endX = direction === 1 ? toIntersection.x : fromIntersection.x;
      x = startX + (endX - startX) * progress;
      y = fromIntersection.y;
      vx = direction * 2;
      vy = 0;
    } else {
      const startY = direction === 1 ? fromIntersection.y : toIntersection.y;
      const endY = direction === 1 ? toIntersection.y : fromIntersection.y;
      x = fromIntersection.x;
      y = startY + (endY - startY) * progress;
      vx = 0;
      vy = direction * 2;
    }

    vehicles.push({
      id: uuidv4(),
      x,
      y,
      vx,
      vy,
      speed: 2,
      currentRoad: road.id,
      direction,
      stopped: false,
      waitingAt: null,
    });
  }

  return vehicles;
}

function generateSignals() {
  const signals = {};
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const id = `${x}-${y}`;
      const offset = (x + y) % 2 * (DEFAULT_SIGNAL_DURATION / 2);
      signals[id] = {
        id,
        horizontalDuration: DEFAULT_SIGNAL_DURATION,
        verticalDuration: DEFAULT_SIGNAL_DURATION,
        state: 'green',
        activeDirection: 'horizontal',
        remainingTime: DEFAULT_SIGNAL_DURATION - offset,
        x,
        y,
      };
    }
  }
  return signals;
}

const network = generateNetwork();
let vehicles = generateVehicles(network, 1);
let signals = generateSignals();
let vehicleDensity = 1;

function updateSignals() {
  Object.keys(signals).forEach(key => {
    const signal = signals[key];
    signal.remainingTime -= 1 / 30;
    
    if (signal.remainingTime <= 0) {
      if (signal.activeDirection === 'horizontal') {
        signal.activeDirection = 'vertical';
        signal.remainingTime = signal.verticalDuration;
      } else {
        signal.activeDirection = 'horizontal';
        signal.remainingTime = signal.horizontalDuration;
      }
    }
    
    if (signal.remainingTime <= 3) {
      signal.state = 'yellow';
    } else {
      signal.state = 'green';
    }
  });
}

function canPassThrough(vehicle, intersection) {
  if (!intersection) return true;
  
  const signal = signals[intersection.id];
  if (!signal) return true;
  
  if (signal.state === 'yellow') {
    return vehicle.speed > 1;
  }
  
  const isHorizontal = vehicle.vy === 0;
  return isHorizontal ? signal.activeDirection === 'horizontal' : signal.activeDirection === 'vertical';
}

function updateVehicles() {
  const { intersections, roads } = network;
  
  vehicles.forEach(vehicle => {
    if (vehicle.stopped) {
      const signal = vehicle.waitingAt ? signals[vehicle.waitingAt] : null;
      if (signal) {
        const isHorizontal = vehicle.vy === 0;
        const canGo = isHorizontal 
          ? signal.activeDirection === 'horizontal' 
          : signal.activeDirection === 'vertical';
        if (canGo && signal.state !== 'yellow') {
          vehicle.stopped = false;
          vehicle.waitingAt = null;
        }
      }
      return;
    }
    
    let nextIntersection = null;
    let distanceToIntersection = Infinity;
    
    intersections.forEach(intersection => {
      const dx = intersection.x - vehicle.x;
      const dy = intersection.y - vehicle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const isMovingTowards = 
        (vehicle.vx > 0 && dx > 0 && Math.abs(dy) < 10) ||
        (vehicle.vx < 0 && dx < 0 && Math.abs(dy) < 10) ||
        (vehicle.vy > 0 && dy > 0 && Math.abs(dx) < 10) ||
        (vehicle.vy < 0 && dy < 0 && Math.abs(dx) < 10);
      
      if (isMovingTowards && distance < distanceToIntersection && distance > 5) {
        distanceToIntersection = distance;
        nextIntersection = intersection;
      }
    });
    
    if (nextIntersection && distanceToIntersection < 15) {
      if (!canPassThrough(vehicle, nextIntersection)) {
        vehicle.stopped = true;
        vehicle.waitingAt = nextIntersection.id;
        return;
      }
    }
    
    const stoppedVehicleAhead = vehicles.find(v => 
      v.id !== vehicle.id &&
      v.stopped &&
      ((vehicle.vx > 0 && v.x > vehicle.x && v.x < vehicle.x + 20 && Math.abs(v.y - vehicle.y) < 8) ||
       (vehicle.vx < 0 && v.x < vehicle.x && v.x > vehicle.x - 20 && Math.abs(v.y - vehicle.y) < 8) ||
       (vehicle.vy > 0 && v.y > vehicle.y && v.y < vehicle.y + 20 && Math.abs(v.x - vehicle.x) < 8) ||
       (vehicle.vy < 0 && v.y < vehicle.y && v.y > vehicle.y - 20 && Math.abs(v.x - vehicle.x) < 8))
    );
    
    if (stoppedVehicleAhead) {
      vehicle.stopped = true;
      vehicle.waitingAt = stoppedVehicleAhead.waitingAt;
      return;
    }
    
    vehicle.x += vehicle.vx;
    vehicle.y += vehicle.vy;
    
    const maxX = (GRID_SIZE - 1) * ROAD_SPACING + 80;
    const maxY = (GRID_SIZE - 1) * ROAD_SPACING + 80;
    const minX = 80;
    const minY = 80;
    
    if (vehicle.x > maxX + 20) vehicle.x = minX - 20;
    if (vehicle.x < minX - 20) vehicle.x = maxX + 20;
    if (vehicle.y > maxY + 20) vehicle.y = minY - 20;
    if (vehicle.y < minY - 20) vehicle.y = maxY + 20;
    
    const onRoad = roads.some(road => {
      const from = intersections.find(i => i.id === road.from);
      const to = intersections.find(i => i.id === road.to);
      if (road.direction === 'horizontal') {
        return Math.abs(vehicle.y - from.y) < 10 &&
               vehicle.x >= Math.min(from.x, to.x) - 20 &&
               vehicle.x <= Math.max(from.x, to.x) + 20;
      } else {
        return Math.abs(vehicle.x - from.x) < 10 &&
               vehicle.y >= Math.min(from.y, to.y) - 20 &&
               vehicle.y <= Math.max(from.y, to.y) + 20;
      }
    });
    
    if (!onRoad) {
      const nearestRoad = roads[Math.floor(Math.random() * roads.length)];
      const from = intersections.find(i => i.id === nearestRoad.from);
      vehicle.currentRoad = nearestRoad.id;
      if (nearestRoad.direction === 'horizontal') {
        vehicle.y = from.y;
        vehicle.vy = 0;
        vehicle.vx = (Math.random() > 0.5 ? 1 : -1) * 2;
      } else {
        vehicle.x = from.x;
        vehicle.vx = 0;
        vehicle.vy = (Math.random() > 0.5 ? 1 : -1) * 2;
      }
    }
  });
}

let simulationInterval = setInterval(() => {
  updateSignals();
  updateVehicles();
}, 1000 / 30);

app.get('/api/network', (req, res) => {
  res.json(network);
});

app.get('/api/traffic', (req, res) => {
  const movingVehicles = vehicles.filter(v => !v.stopped);
  const avgSpeed = movingVehicles.length > 0
    ? movingVehicles.reduce((sum, v) => sum + Math.sqrt(v.vx * v.vx + v.vy * v.vy), 0) / movingVehicles.length
    : 0;
  
  const congestionIndex = Math.min(100, (vehicles.filter(v => v.stopped).length / vehicles.length) * 150);
  
  res.json({
    vehicles,
    avgSpeed,
    congestionIndex,
    timestamp: Date.now(),
  });
});

app.get('/api/signals', (req, res) => {
  res.json({
    signals: Object.values(signals),
    timestamp: Date.now(),
  });
});

app.put('/api/signals/:intersectionId', (req, res) => {
  const { intersectionId } = req.params;
  const { horizontalDuration, verticalDuration } = req.body;
  
  if (signals[intersectionId]) {
    if (horizontalDuration) {
      signals[intersectionId].horizontalDuration = Math.max(10, Math.min(60, horizontalDuration));
    }
    if (verticalDuration) {
      signals[intersectionId].verticalDuration = Math.max(10, Math.min(60, verticalDuration));
    }
  }
  
  setTimeout(() => {
    res.json({
      success: true,
      signal: signals[intersectionId],
      signals: Object.values(signals),
      vehicles,
    });
  }, 100 + Math.random() * 300);
});

app.post('/api/reset', (req, res) => {
  const { density = 1 } = req.body;
  vehicleDensity = density;
  vehicles = generateVehicles(network, density);
  signals = generateSignals();
  
  res.json({
    success: true,
    vehicles,
    signals: Object.values(signals),
  });
});

app.put('/api/density', (req, res) => {
  const { density } = req.body;
  vehicleDensity = density;
  
  const currentCount = vehicles.length;
  const targetCount = Math.floor(INITIAL_VEHICLE_COUNT * density);
  
  if (targetCount > currentCount) {
    const newVehicles = generateVehicles(network, (targetCount - currentCount) / INITIAL_VEHICLE_COUNT);
    vehicles = [...vehicles, ...newVehicles];
  } else if (targetCount < currentCount) {
    vehicles = vehicles.slice(0, targetCount);
  }
  
  res.json({
    success: true,
    density,
    vehicleCount: vehicles.length,
  });
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});
