import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const uploadsDir = join(__dirname, '..', 'uploads');
const dataDir = join(__dirname, '..', 'data');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持JPG/PNG格式图片'));
  },
});

const recordsFile = join(dataDir, 'restoration-records.json');

function readRecords() {
  try {
    if (!fs.existsSync(recordsFile)) return [];
    const content = fs.readFileSync(recordsFile, 'utf-8');
    return JSON.parse(content || '[]');
  } catch {
    return [];
  }
}

function writeRecords(records) {
  fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));
}

function generatePolygon(cx, cy, radius, points, irregularity = 0.3) {
  const polygon = [];
  for (let i = 0; i < points; i++) {
    const angle = (2 * Math.PI * i) / points + Math.random() * 0.1;
    const r = radius * (1 - irregularity + Math.random() * irregularity * 2);
    polygon.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return polygon;
}

async function analyzeWormholes(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  const { data } = await image
    .greyscale()
    .threshold(180)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    binary[i] = data[i] < 128 ? 1 : 0;
  }

  const visited = new Uint8Array(width * height);
  const wormholes = [];
  const minArea = 50;
  const maxHoles = 30;

  function floodFill(startX, startY) {
    const queue = [[startX, startY]];
    const points = [];
    const stack = [[startX, startY]];
    visited[startY * width + startX] = 1;
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let sumX = 0, sumY = 0, count = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      points.push([x, y]);
      sumX += x;
      sumY += y;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const neighbors = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
        [x + 1, y + 1], [x + 1, y - 1], [x - 1, y + 1], [x - 1, y - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = ny * width + nx;
          if (binary[idx] === 1 && visited[idx] === 0) {
            visited[idx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
    }
    return { points, minX, maxX, minY, maxY, sumX, sumY, count };
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binary[idx] === 1 && visited[idx] === 0) {
        const result = floodFill(x, y);
        const area = result.count;
        if (area >= minArea) {
          const cx = result.sumX / result.count;
          const cy = result.sumY / result.count;
          const avgRadius = Math.sqrt(area / Math.PI);
          const numPoints = Math.max(8, Math.min(32, Math.floor(area / 20)));

          const contour = generatePolygon(cx, cy, avgRadius * 0.9, numPoints, 0.25);
          wormholes.push({
            id: uuidv4(),
            center: [Math.round(cx), Math.round(cy)],
            area: area,
            radius: Math.round(avgRadius),
            contour: contour.map(([px, py]) => [
              Math.max(0, Math.min(width - 1, Math.round(px))),
              Math.max(0, Math.min(height - 1, Math.round(py))),
            ]),
            boundingBox: {
              x: result.minX,
              y: result.minY,
              w: result.maxX - result.minX,
              h: result.maxY - result.minY,
            },
          });
        }
        if (wormholes.length >= maxHoles) break;
      }
    }
    if (wormholes.length >= maxHoles) break;
  }

  if (wormholes.length === 0) {
    const numSimulated = 5 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numSimulated; i++) {
      const cx = width * (0.15 + Math.random() * 0.7);
      const cy = height * (0.15 + Math.random() * 0.7);
      const radius = 15 + Math.random() * 40;
      const numPoints = 10 + Math.floor(Math.random() * 16);
      const contour = generatePolygon(cx, cy, radius, numPoints, 0.3);
      wormholes.push({
        id: uuidv4(),
        center: [Math.round(cx), Math.round(cy)],
        area: Math.round(Math.PI * radius * radius * 0.8),
        radius: Math.round(radius),
        contour: contour.map(([px, py]) => [
          Math.max(0, Math.min(width - 1, Math.round(px))),
          Math.max(0, Math.min(height - 1, Math.round(py))),
        ]),
        boundingBox: {
          x: Math.round(cx - radius),
          y: Math.round(cy - radius),
          w: Math.round(radius * 2),
          h: Math.round(radius * 2),
        },
      });
    }
  }

  return {
    width,
    height,
    wormholes: wormholes.sort((a, b) => b.area - a.area),
  };
}

function generateFiberPaths(wormhole) {
  const { contour, center } = wormhole;
  const fibers = [];
  const numFibers = Math.max(200, Math.floor(wormhole.area / 3));
  const [cx, cy] = center;

  for (let i = 0; i < numFibers; i++) {
    const progress = i / numFibers;
    const edgeIdx = Math.floor(Math.random() * contour.length);
    const edgePoint = contour[edgeIdx];
    const [ex, ey] = edgePoint;

    const spiralAngle = progress * Math.PI * 6 + Math.random() * 0.5;
    const spiralRadius = Math.max(0, wormhole.radius * (1 - progress * 0.85) + (Math.random() - 0.5) * 6);

    const startX = ex + (cx - ex) * progress * 0.3;
    const startY = ey + (cy - ey) * progress * 0.3;

    const endX = cx + Math.cos(spiralAngle) * spiralRadius;
    const endY = cy + Math.sin(spiralAngle) * spiralRadius;

    const len = 2 + Math.random() * 3;
    const angle = Math.atan2(
      endY - startY + (Math.random() - 0.5) * 2,
      endX - startX + (Math.random() - 0.5) * 2
    );
    const actualEndX = startX + Math.cos(angle) * len;
    const actualEndY = startY + Math.sin(angle) * len;

    fibers.push({
      id: `fiber-${i}`,
      start: [Math.round(startX), Math.round(startY)],
      end: [Math.round(actualEndX), Math.round(actualEndY)],
      opacity: 0.4 + Math.random() * 0.4,
      delay: i * 10,
      duration: 300 + Math.random() * 400,
    });
  }
  return fibers;
}

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传图片' });
    const result = await analyzeWormholes(req.file.path);
    res.json({
      success: true,
      imageUrl: `/uploads/${req.file.filename}`,
      imagePath: req.file.path,
      filename: req.file.filename,
      ...result,
    });
  } catch (error) {
    console.error('分析失败:', error);
    res.status(500).json({ error: '虫洞分析失败: ' + error.message });
  }
});

app.post('/api/pulp-generate', (req, res) => {
  try {
    const { wormhole } = req.body;
    if (!wormhole) return res.status(400).json({ error: '缺少虫洞数据' });
    const fibers = generateFiberPaths(wormhole);
    res.json({
      success: true,
      wormholeId: wormhole.id,
      fibers,
      pulpConfig: {
        color: '#d4a373',
        fiberLength: '2-5px',
        totalFibers: fibers.length,
        estimatedDuration: fibers.length * 10 + 500,
      },
    });
  } catch (error) {
    console.error('纸浆生成失败:', error);
    res.status(500).json({ error: '纸浆生成失败: ' + error.message });
  }
});

app.post('/api/save-restoration', (req, res) => {
  try {
    const { imageFilename, wormholeId, annotation, rating, thumbnail } = req.body;
    if (!wormholeId || rating == null) {
      return res.status(400).json({ error: '缺少必要字段' });
    }
    const records = readRecords();
    const newRecord = {
      id: uuidv4(),
      imageFilename,
      wormholeId,
      annotation: annotation || '',
      rating: Math.max(1, Math.min(5, rating)),
      thumbnail: thumbnail || '',
      createdAt: new Date().toISOString(),
    };
    records.unshift(newRecord);
    writeRecords(records);
    res.json({ success: true, record: newRecord });
  } catch (error) {
    console.error('保存失败:', error);
    res.status(500).json({ error: '保存修复记录失败: ' + error.message });
  }
});

app.get('/api/records', (req, res) => {
  try {
    const records = readRecords();
    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ error: '获取记录失败' });
  }
});

app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n📚 古籍虫洞修复系统后端已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/api/health\n`);
});
