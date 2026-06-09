import { GRID_COLS, GRID_ROWS, CELL_SIZE } from './types';
const EXPORT_WIDTH = 1920;
const EXPORT_HEIGHT = 1080;
const GRID_BG_COLOR = '#EAEAEC';
const GRID_BORDER_COLOR = '#D0D0D4';
const TEXT_COLOR = '#2B2D42';
const GRID_PIXEL_WIDTH = GRID_COLS * CELL_SIZE;
const GRID_PIXEL_HEIGHT = GRID_ROWS * CELL_SIZE;
export function exportToPNG(placedWords) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = EXPORT_WIDTH;
            canvas.height = EXPORT_HEIGHT;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Cannot get 2D context'));
                return;
            }
            ctx.fillStyle = GRID_BG_COLOR;
            ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
            const scaleX = EXPORT_WIDTH / GRID_PIXEL_WIDTH;
            const scaleY = EXPORT_HEIGHT / GRID_PIXEL_HEIGHT;
            const scale = Math.min(scaleX, scaleY);
            const offsetX = (EXPORT_WIDTH - GRID_PIXEL_WIDTH * scale) / 2;
            const offsetY = (EXPORT_HEIGHT - GRID_PIXEL_HEIGHT * scale) / 2;
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);
            drawGrid(ctx);
            drawWords(ctx, placedWords);
            ctx.restore();
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `visual-poetry-${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    resolve();
                }
                else {
                    reject(new Error('Failed to create blob'));
                }
            }, 'image/png');
        }
        catch (err) {
            reject(err);
        }
    });
}
function drawGrid(ctx) {
    ctx.strokeStyle = GRID_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let x = 0; x <= GRID_COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, GRID_PIXEL_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(GRID_PIXEL_WIDTH, y * CELL_SIZE);
        ctx.stroke();
    }
    ctx.setLineDash([]);
}
function drawWords(ctx, placedWords) {
    const sorted = [...placedWords].sort((a, b) => a.zIndex - b.zIndex);
    for (const word of sorted) {
        drawWord(ctx, word);
    }
}
function drawWord(ctx, word) {
    const centerX = word.gridX * CELL_SIZE + CELL_SIZE / 2;
    const centerY = word.gridY * CELL_SIZE + CELL_SIZE / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((word.rotation * Math.PI) / 180);
    ctx.scale(word.scale, word.scale);
    ctx.globalAlpha = word.opacity;
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `300 16px 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(word.text, 0, 0);
    ctx.restore();
}
