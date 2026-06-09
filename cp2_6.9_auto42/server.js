import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import jsPDF from 'jspdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

const tmpDir = join(__dirname, 'tmp');
if (!existsSync(tmpDir)) {
  mkdirSync(tmpDir, { recursive: true });
}

function base64ToBuffer(base64) {
  const data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(data, 'base64');
}

app.post('/api/export-pdf', async (req, res) => {
  try {
    const { cards } = req.body;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'No card images provided' });
    }

    const cardWidthPx = 350;
    const cardHeightPx = 250;

    const pxToMm = (px) => (px * 25.4) / 300;
    const cardWidthMm = pxToMm(cardWidthPx / 2);
    const cardHeightMm = pxToMm(cardHeightPx / 2);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidthMm = doc.internal.pageSize.getWidth();
    const pageHeightMm = doc.internal.pageSize.getHeight();

    const marginMm = 10;
    const gapMm = 2;

    const cols = 9;
    const rows = 9;

    const availableWidth = pageWidthMm - marginMm * 2;
    const availableHeight = pageHeightMm - marginMm * 2;

    const cellWidth = (availableWidth - gapMm * (cols - 1)) / cols;
    const cellHeight = (availableHeight - gapMm * (rows - 1)) / rows;

    const scale = Math.min(cellWidth / cardWidthMm, cellHeight / cardHeightMm);
    const finalCardWidthMm = cardWidthMm * scale;
    const finalCardHeightMm = cardHeightMm * scale;

    const startX = (pageWidthMm - (finalCardWidthMm * cols + gapMm * (cols - 1))) / 2;
    const startY = (pageHeightMm - (finalCardHeightMm * rows + gapMm * (rows - 1))) / 2;

    const cardsPerPage = cols * rows;
    const totalPages = Math.ceil(cards.length / cardsPerPage);

    let cardIndex = 0;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        doc.addPage();
      }

      for (let i = 0; i < cardsPerPage && cardIndex < cards.length; i++, cardIndex++) {
        const row = Math.floor(i / cols);
        const col = i % cols;

        const x = startX + col * (finalCardWidthMm + gapMm);
        const y = startY + row * (finalCardHeightMm + gapMm);

        try {
          const imgBuffer = base64ToBuffer(cards[cardIndex]);
          const tmpFile = join(tmpDir, `${uuidv4()}.png`);
          writeFileSync(tmpFile, imgBuffer);

          doc.addImage(
            tmpFile,
            'PNG',
            x,
            y,
            finalCardWidthMm,
            finalCardHeightMm,
            undefined,
            'FAST'
          );

          try {
            unlinkSync(tmpFile);
          } catch (cleanupErr) {
            // ignore cleanup error
          }
        } catch (imgErr) {
          console.error(`Error processing card ${cardIndex}:`, imgErr);
        }
      }
    }

    const pdfBuffer = doc.output('arraybuffer');
    const pdfNodeBuffer = Buffer.from(pdfBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cards-printable.pdf"');
    res.setHeader('Content-Length', pdfNodeBuffer.length);
    res.send(pdfNodeBuffer);

  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Boardgame Card Designer Server running on http://localhost:${PORT}`);
});
