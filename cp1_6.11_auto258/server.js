import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const CarbonDateRequestSchema = z.object({
  imageBase64: z.string(),
  temperature: z.number().min(0).max(800),
  duration: z.number().min(0).max(60),
});

function parseBase64Image(base64Str) {
  const matches = base64Str.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 image format');
  }
  return {
    mimeType: matches[1],
    data: Buffer.from(matches[3], 'base64'),
  };
}

function calculateDating(temperature, duration, patternDensity) {
  const heatFactor = (temperature / 800) * (duration / 60);
  const densityFactor = patternDensity;
  const totalFactor = heatFactor * 0.6 + densityFactor * 0.4;

  const midYear = Math.round(-500 + totalFactor * 1000);
  const range = Math.max(30, Math.round(150 - totalFactor * 100));

  return {
    startYear: midYear - range,
    endYear: midYear + range,
    midYear,
    confidence: Math.round(60 + totalFactor * 35),
  };
}

function generateCrackSVG(width, height, crackCount) {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  for (let i = 0; i < crackCount; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const crackLength = 10 + Math.random() * 70;
    const crackWidth = 2 + Math.random() * 2;
    const angle = Math.random() * Math.PI * 2;

    const segments = 3 + Math.floor(Math.random() * 4);
    let pathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)}`;
    let currentX = startX;
    let currentY = startY;

    for (let s = 0; s < segments; s++) {
      const segLen = crackLength / segments;
      const segAngle = angle + (Math.random() - 0.5) * 0.8;
      currentX += Math.cos(segAngle) * segLen;
      currentY += Math.sin(segAngle) * segLen;
      pathD += ` L ${currentX.toFixed(1)} ${currentY.toFixed(1)}`;
    }

    svg += `<path d="${pathD}" stroke="#3d2817" stroke-width="${crackWidth.toFixed(1)}" fill="none" stroke-linecap="round" opacity="${(0.6 + Math.random() * 0.4).toFixed(2)}"/>`;
  }

  svg += '</svg>';
  return svg;
}

async function generateCarbonPattern(originalBuffer, temperature, duration) {
  const metadata = await sharp(originalBuffer).metadata();
  const width = metadata.width || 600;
  const height = metadata.height || 200;

  const intensity = Math.min(1, (temperature / 800) * 0.7 + (duration / 60) * 0.3);
  const crackCount = Math.floor(20 + intensity * 80);

  const crackSvg = generateCrackSVG(width, height, crackCount);
  const crackBuffer = Buffer.from(crackSvg);

  const baseR = Math.round(212 - intensity * 170);
  const baseG = Math.round(163 - intensity * 130);
  const baseB = Math.round(115 - intensity * 95);

  let pipeline = sharp(originalBuffer)
    .ensureAlpha()
    .composite([
      {
        input: {
          create: {
            width,
            height,
            channels: 4,
            background: { r: baseR, g: baseG, b: baseB, alpha: Math.round(128 + intensity * 100) },
          },
        },
        blend: 'multiply',
      },
      {
        input: crackBuffer,
        blend: 'over',
      },
    ]);

  if (intensity > 0.3) {
    const edgeDarkness = Math.round(intensity * 80);
    const vignetteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <radialGradient id="edge" cx="50%" cy="50%" r="70%">
          <stop offset="60%" stop-color="transparent"/>
          <stop offset="100%" stop-color="#1a0f05" stop-opacity="${(intensity * 0.8).toFixed(2)}"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#edge)"/>
    </svg>`;
    pipeline = pipeline.composite([
      {
        input: Buffer.from(vignetteSvg),
        blend: 'over',
      },
    ]);
  }

  const processedBuffer = await pipeline.png().toBuffer();
  const patternBase64 = `data:image/png;base64,${processedBuffer.toString('base64')}`;

  return { patternBase64, patternDensity: intensity };
}

app.post('/api/carbon-date', async (req, res) => {
  try {
    const validated = CarbonDateRequestSchema.parse(req.body);
    const { imageBase64, temperature, duration } = validated;

    const { data: imageBuffer } = parseBase64Image(imageBase64);
    const { patternBase64, patternDensity } = await generateCarbonPattern(imageBuffer, temperature, duration);
    const datingResult = calculateDating(temperature, duration, patternDensity);

    const formatYear = (year) => {
      if (year < 0) return `公元前${Math.abs(year)}年`;
      return `公元${year}年`;
    };

    res.json({
      success: true,
      requestId: uuidv4(),
      patternImage: patternBase64,
      dating: {
        startYear: datingResult.startYear,
        endYear: datingResult.endYear,
        midYear: datingResult.midYear,
        startYearLabel: formatYear(datingResult.startYear),
        endYearLabel: formatYear(datingResult.endYear),
        midYearLabel: formatYear(datingResult.midYear),
        confidence: datingResult.confidence,
        description: `根据碳化纹路密度与火烤曲线分析，该竹简制作年代约为${formatYear(datingResult.startYear)}至${formatYear(datingResult.endYear)}`,
      },
      params: {
        temperature,
        duration,
        carbonizationLevel: Math.round(patternDensity * 100),
      },
    });
  } catch (error) {
    console.error('Carbon dating error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: '参数校验失败',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || '断代分析失败',
      });
    }
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`竹简断代服务已启动: http://localhost:${PORT}`);
});
