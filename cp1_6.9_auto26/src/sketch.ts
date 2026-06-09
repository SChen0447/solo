import p5 from 'p5';
import { MagicScene } from './scene';
import { audioManager } from './audio';
import {
  type Point,
  type RuneType,
  type DrawnRune,
  type HistoryItem,
  type Stats,
  RUNE_DEFINITIONS,
  matchRune,
  getComboEffect
} from './magic';

interface InkBlot {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

interface StrokePoint extends Point {
  width: number;
}

const CANVAS_W = 900;
const CANVAS_H = 600;

let threeScene: MagicScene;
let drawnRunes: DrawnRune[] = [];
let comboSlot: (DrawnRune | null)[] = [null, null, null, null];
let history: HistoryItem[] = [];
let stats: Stats = {
  totalDrawn: 0,
  successfulMatches: 0,
  totalReleased: 0,
  maxComboLength: 0
};

let isDrawing = false;
let currentStroke: StrokePoint[] = [];
let inkBlots: InkBlot[] = [];
let lastPointTime = 0;
let parchmentCache: p5.Graphics | null = null;
let starfield: { x: number; y: number; r: number; phase: number }[] = [];
let dragRune: DrawnRune | null = null;
let dragOffset = { x: 0, y: 0 };
let statsPanelVisible = false;

let draggingFromSlotIndex = -1;

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const sketch = (p: p5) => {
  p.preload = () => {
    // no-op
  };

  p.setup = () => {
    const canvas = p.createCanvas(CANVAS_W, CANVAS_H);
    canvas.parent('p5-container');
    p.pixelDensity(1);

    parchmentCache = p.createGraphics(CANVAS_W, CANVAS_H);
    drawParchment(parchmentCache);

    for (let i = 0; i < 120; i++) {
      starfield.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        r: Math.random() * 1.5 + 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }

    setupUI();

    audioManager.init();
  };

  p.draw = () => {
    p.clear();

    p.push();
    drawStarfield(p);
    p.pop();

    if (parchmentCache) {
      p.image(parchmentCache, 0, 0);
      drawVignette(p);
    }

    const now = p.millis();

    for (let i = inkBlots.length - 1; i >= 0; i--) {
      const b = inkBlots[i];
      const t = (now - b.startTime) / b.duration;
      if (t >= 1) {
        inkBlots.splice(i, 1);
        continue;
      }
      const maxR = 18;
      const r = maxR * p.easeOutQuad(t);
      p.push();
      p.noStroke();
      p.drawingContext.globalAlpha = 0.25 * (1 - t);
      p.fill(180, 140, 60);
      p.ellipse(b.x, b.y, r, r);
      p.drawingContext.globalAlpha = 1;
      p.pop();
    }

    for (const rune of drawnRunes) {
      rune.rotation += rune.rotationSpeed;
      rune.glowPhase += 0.04;
      drawRune(p, rune);
    }

    if (isDrawing && currentStroke.length > 1) {
      drawCurrentStroke(p);
    }

    if (dragRune) {
      p.push();
      p.translate(p.mouseX - dragOffset.x, p.mouseY - dragOffset.y);
      p.rotate(dragRune.rotation);
      p.scale(dragRune.scale * 1.1);
      const def = RUNE_DEFINITIONS[dragRune.type];
      const glow = 0.6 + 0.4 * Math.sin(dragRune.glowPhase);
      p.drawingContext.shadowColor = def.color;
      p.drawingContext.shadowBlur = 25 * glow;
      drawRuneShape(p, dragRune.type, def.color);
      p.drawingContext.shadowBlur = 0;
      p.pop();
    }

    if (!isDrawing && currentStroke.length > 0 && p.millis() - lastPointTime > 300) {
      finalizeStroke();
    }
  };

  function drawStarfield(p: p5) {
    const t = p.millis() / 1000;
    for (const s of starfield) {
      const alpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + s.phase));
      p.noStroke();
      p.fill(255, 255, 255, alpha * 180);
      p.ellipse(s.x, s.y, s.r * 2, s.r * 2);
    }
  }

  function drawParchment(g: p5.Graphics) {
    const grad = g.drawingContext.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    grad.addColorStop(0, '#eaddc0');
    grad.addColorStop(1, '#c8b896');
    g.drawingContext.fillStyle = grad;
    g.drawingContext.fillRect(0, 0, CANVAS_W, CANVAS_H);

    g.noStroke();
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * CANVAS_W;
      const y = Math.random() * CANVAS_H;
      const a = Math.random() * 18;
      const sz = Math.random() * 3 + 0.5;
      g.fill(139, 105, 20, a);
      g.ellipse(x, y, sz, sz);
    }

    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * CANVAS_W;
      const cy = Math.random() * CANVAS_H;
      const r = 40 + Math.random() * 80;
      for (let j = 0; j < 60; j++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * r;
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d;
        g.fill(101, 67, 33, Math.random() * 12);
        g.ellipse(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
    }

    g.drawingContext.save();
    g.drawingContext.shadowColor = 'rgba(60, 30, 0, 0.5)';
    g.drawingContext.shadowBlur = 40;
    g.noFill();
    g.stroke(80, 50, 10, 0);
    g.strokeWeight(0);
    g.rect(0, 0, CANVAS_W, CANVAS_H);
    g.drawingContext.restore();

    g.drawingContext.save();
    g.drawingContext.strokeStyle = 'rgba(100, 65, 20, 0.35)';
    g.drawingContext.lineWidth = 3;
    g.drawingContext.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      g.drawingContext.strokeRect(i * 2, i * 2, CANVAS_W - i * 4, CANVAS_H - i * 4);
    }
    g.drawingContext.restore();
  }

  function drawVignette(p: p5) {
    const grad = p.drawingContext.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.3,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.75
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(60,30,0,0.35)');
    p.drawingContext.fillStyle = grad;
    p.drawingContext.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawCurrentStroke(p: p5) {
    if (currentStroke.length < 2) return;
    p.push();
    p.noFill();
    for (let i = 1; i < currentStroke.length; i++) {
      const a = currentStroke[i - 1];
      const b = currentStroke[i];
      const t = i / currentStroke.length;
      const r = p.lerp(255, 255, t);
      const g = p.lerp(215, 170, t);
      const bl = p.lerp(0, 0, t);
      p.stroke(r, g, bl);
      p.strokeWeight(b.width);
      p.strokeCap(p.ROUND);
      p.strokeJoin(p.ROUND);
      p.drawingContext.shadowColor = '#ffd700';
      p.drawingContext.shadowBlur = 15;
      p.line(a.x, a.y, b.x, b.y);
    }
    p.drawingContext.shadowBlur = 0;
    p.pop();
  }

  function drawRune(p: p5, rune: DrawnRune) {
    p.push();
    p.translate(rune.center.x, rune.center.y);
    p.rotate(rune.rotation);
    p.scale(rune.scale);
    const def = RUNE_DEFINITIONS[rune.type];
    const glow = 0.5 + 0.5 * Math.sin(rune.glowPhase);
    p.drawingContext.shadowColor = def.color;
    p.drawingContext.shadowBlur = 20 + 15 * glow;
    drawRuneShape(p, rune.type, def.color);
    p.drawingContext.shadowBlur = 8;
    drawRuneShape(p, rune.type, def.color);
    p.drawingContext.shadowBlur = 0;
    p.pop();
  }

  function drawRuneShape(p: p5, type: RuneType, color: string) {
    p.stroke(color);
    p.fill(color + '55');
    p.strokeWeight(3);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    const s = 36;

    p.push();
    switch (type) {
      case 'fire':
        p.triangle(0, -s, -s * 0.9, s * 0.75, s * 0.9, s * 0.75);
        break;
      case 'ice':
        p.beginShape();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * s;
          const y = Math.sin(a) * s;
          p.vertex(x, y);
        }
        p.endShape(p.CLOSE);
        p.line(-s * 0.5, 0, s * 0.5, 0);
        p.line(0, -s * 0.5, 0, s * 0.5);
        break;
      case 'lightning':
        p.beginShape();
        p.vertex(-s * 0.2, -s);
        p.vertex(s * 0.4, -s * 0.1);
        p.vertex(0, -s * 0.05);
        p.vertex(s * 0.5, s);
        p.vertex(-s * 0.1, s * 0.1);
        p.vertex(s * 0.25, s * 0.05);
        p.endShape(p.CLOSE);
        break;
      case 'heal':
        p.beginShape();
        const hs = s * 0.9;
        for (let i = 0; i <= 60; i++) {
          const t = (i / 60) * Math.PI * 2;
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          p.vertex((x / 16) * hs, (y / 16) * hs);
        }
        p.endShape(p.CLOSE);
        break;
      case 'wind':
        p.beginShape();
        for (let i = 0; i <= 180; i++) {
          const t = i / 180;
          const angle = t * Math.PI * 5;
          const r = t * s;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          p.vertex(x, y);
        }
        p.endShape();
        break;
      case 'star':
        p.beginShape();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? s : s * 0.45;
          p.vertex(Math.cos(a) * r, Math.sin(a) * r);
        }
        p.endShape(p.CLOSE);
        break;
    }
    p.pop();
  }

  p.mousePressed = () => {
    if (p.mouseX < 0 || p.mouseX > CANVAS_W || p.mouseY < 0 || p.mouseY > CANVAS_H) return;
    audioManager.init();

    for (let i = drawnRunes.length - 1; i >= 0; i--) {
      const r = drawnRunes[i];
      const dx = p.mouseX - r.center.x;
      const dy = p.mouseY - r.center.y;
      if (dx * dx + dy * dy < 50 * 50) {
        dragRune = r;
        dragOffset = { x: p.mouseX - r.center.x, y: p.mouseY - r.center.y };
        draggingFromSlotIndex = -1;
        drawnRunes.splice(i, 1);
        return;
      }
    }

    isDrawing = true;
    currentStroke = [];
    addStrokePoint();
  };

  p.mouseDragged = () => {
    if (dragRune) return;
    if (!isDrawing) return;
    if (p.mouseX < 0 || p.mouseX > CANVAS_W || p.mouseY < 0 || p.mouseY > CANVAS_H) return;
    addStrokePoint();
  };

  p.mouseReleased = () => {
    if (dragRune) {
      handleDrop();
      dragRune = null;
      draggingFromSlotIndex = -1;
      return;
    }

    if (isDrawing) {
      isDrawing = false;
      addStrokePoint();
    }
  };

  p.touchStarted = (e: TouchEvent) => {
    e.preventDefault();
    if (p.mouseX < 0 || p.mouseX > CANVAS_W || p.mouseY < 0 || p.mouseY > CANVAS_H) return;
    audioManager.init();
    isDrawing = true;
    currentStroke = [];
    addStrokePoint();
  };

  p.touchMoved = (e: TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    addStrokePoint();
  };

  p.touchEnded = (e: TouchEvent) => {
    e.preventDefault();
    if (isDrawing) {
      isDrawing = false;
    }
  };

  function addStrokePoint() {
    const last = currentStroke[currentStroke.length - 1];
    const now = p.millis();
    let width = 4;
    if (last) {
      const dx = p.mouseX - last.x;
      const dy = p.mouseY - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = now - last.t;
      if (dt === 0 || dist < 2) return;
      const speed = dist / dt;
      width = p.constrain(p.map(speed, 0.1, 4, 6, 3), 3, 6);
      audioManager.playStroke(p.map(speed, 0.5, 3, 0.3, 0.9));
    }
    currentStroke.push({ x: p.mouseX, y: p.mouseY, t: now, width });
    lastPointTime = now;
  }

  function finalizeStroke() {
    if (currentStroke.length < 5) {
      currentStroke = [];
      return;
    }

    const last = currentStroke[currentStroke.length - 1];
    inkBlots.push({
      x: last.x,
      y: last.y,
      startTime: p.millis(),
      duration: 300
    });
    audioManager.playInkBlot();

    const simplePoints: Point[] = currentStroke.map(sp => ({ x: sp.x, y: sp.y, t: sp.t }));
    const matched = matchRune(simplePoints);
    stats.totalDrawn++;

    if (matched) {
      stats.successfulMatches++;
      let cx = 0, cy = 0;
      for (const pt of currentStroke) {
        cx += pt.x;
        cy += pt.y;
      }
      cx /= currentStroke.length;
      cy /= currentStroke.length;

      const rune: DrawnRune = {
        id: genId(),
        type: matched,
        center: { x: cx, y: cy },
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.015,
        createdAt: Date.now(),
        scale: 1,
        glowPhase: Math.random() * Math.PI * 2
      };
      drawnRunes.push(rune);
      audioManager.playCharge(RUNE_DEFINITIONS[matched].color);
      addHistory([matched], false, true, RUNE_DEFINITIONS[matched].name);
    } else {
      audioManager.playFail();
    }

    currentStroke = [];
    updateStatsUI();
  }

  function handleDrop() {
    if (!dragRune) return;
    const slotEl = document.getElementById('rune-slot');
    if (!slotEl) return;
    const rect = slotEl.getBoundingClientRect();
    const mouseX = p.mouseX;
    const mouseY = p.mouseY;

    const pageCanvasRect = (document.getElementById('p5-container') as HTMLElement).getBoundingClientRect();
    const screenMouseX = pageCanvasRect.left + mouseX;
    const screenMouseY = pageCanvasRect.top + mouseY;

    if (screenMouseX >= rect.left && screenMouseX <= rect.right &&
        screenMouseY >= rect.top && screenMouseY <= rect.bottom) {
      const spaces = document.querySelectorAll('.slot-space');
      let dropped = false;
      spaces.forEach((spaceEl, idx) => {
        if (dropped) return;
        const sr = spaceEl.getBoundingClientRect();
        if (screenMouseX >= sr.left && screenMouseX <= sr.right &&
            screenMouseY >= sr.top && screenMouseY <= sr.bottom) {
          if (draggingFromSlotIndex >= 0) {
            comboSlot[draggingFromSlotIndex] = null;
          }
          if (comboSlot[idx] && draggingFromSlotIndex < 0) {
            drawnRunes.push(comboSlot[idx]!);
          } else if (comboSlot[idx] && draggingFromSlotIndex >= 0) {
            comboSlot[draggingFromSlotIndex] = comboSlot[idx];
          }
          comboSlot[idx] = dragRune;
          dropped = true;
        }
      });
      if (!dropped) {
        if (draggingFromSlotIndex < 0) {
          drawnRunes.push(dragRune);
        } else {
          comboSlot[draggingFromSlotIndex] = dragRune;
        }
      }
    } else {
      if (mouseX < 0 || mouseX > CANVAS_W || mouseY < 0 || mouseY > CANVAS_H) {
        if (draggingFromSlotIndex >= 0) {
          drawnRunes.push(dragRune);
          comboSlot[draggingFromSlotIndex] = null;
        } else {
          drawnRunes.push(dragRune);
        }
      } else {
        dragRune.center = { x: mouseX - dragOffset.x, y: mouseY - dragOffset.y };
        if (draggingFromSlotIndex >= 0) {
          comboSlot[draggingFromSlotIndex] = null;
        }
        drawnRunes.push(dragRune);
      }
    }
    updateSlotUI();
  }

  function setupUI() {
    const statsToggle = document.getElementById('stats-toggle');
    const statsPanel = document.getElementById('stats-panel');
    if (statsToggle && statsPanel) {
      statsToggle.addEventListener('click', () => {
        statsPanelVisible = !statsPanelVisible;
        statsPanel.classList.toggle('visible', statsPanelVisible);
      });
    }

    const releaseBtn = document.getElementById('release-btn');
    if (releaseBtn) {
      releaseBtn.addEventListener('click', () => releaseCombo());
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        releaseCombo();
      }
    });

    const spaces = document.querySelectorAll('.slot-space');
    spaces.forEach((spaceEl, idx) => {
      spaceEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        (spaceEl as HTMLElement).classList.add('drag-over');
      });
      spaceEl.addEventListener('dragleave', () => {
        (spaceEl as HTMLElement).classList.remove('drag-over');
      });
    });

    updateSlotUI();
    updateStatsUI();
  }

  function updateSlotUI() {
    const spaces = document.querySelectorAll('.slot-space');
    spaces.forEach((spaceEl, idx) => {
      const rune = comboSlot[idx];
      spaceEl.innerHTML = '';
      (spaceEl as HTMLElement).classList.remove('drag-over');
      if (rune) {
        const def = RUNE_DEFINITIONS[rune.type];
        const el = document.createElement('div');
        el.className = 'slot-rune';
        el.textContent = def.symbol;
        el.style.color = def.color;
        el.style.background = def.color + '33';
        el.draggable = true;
        el.addEventListener('dragstart', (e) => {
          dragRune = rune;
          draggingFromSlotIndex = idx;
          comboSlot[idx] = null;
          e.dataTransfer?.setData('text/plain', rune.id);
          setTimeout(() => updateSlotUI(), 0);
        });
        el.addEventListener('dragend', () => {
          if (dragRune && draggingFromSlotIndex >= 0 && !comboSlot.includes(dragRune) && !drawnRunes.includes(dragRune)) {
            comboSlot[draggingFromSlotIndex] = dragRune;
          }
          dragRune = null;
          draggingFromSlotIndex = -1;
          updateSlotUI();
        });
        spaceEl.appendChild(el);
      }
    });

    const hasRunes = comboSlot.some(r => r !== null);
    const releaseBtn = document.getElementById('release-btn') as HTMLButtonElement;
    if (releaseBtn) {
      releaseBtn.disabled = !hasRunes;
    }
  }

  function releaseCombo() {
    const runes = comboSlot.filter((r): r is DrawnRune => r !== null);
    if (runes.length === 0) return;

    const types = runes.map(r => r.type);
    const combo = getComboEffect(types);
    threeScene.triggerMagicCircle(combo);
    audioManager.playRelease(runes.length);

    stats.totalReleased++;
    if (runes.length > stats.maxComboLength) {
      stats.maxComboLength = runes.length;
    }
    addHistory(types, runes.length > 1, true, combo.name);

    comboSlot = [null, null, null, null];
    updateSlotUI();
    updateStatsUI();
  }

  function addHistory(types: RuneType[], isCombo: boolean, success: boolean, effectName: string) {
    history.unshift({
      timestamp: Date.now(),
      runeTypes: types,
      isCombo,
      success,
      effectName
    });
    if (history.length > 50) history.pop();
    updateHistoryUI();
  }

  function formatTime(ts: number) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  function updateHistoryUI() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';
    for (const item of history) {
      const div = document.createElement('div');
      div.className = 'history-item';
      const time = document.createElement('span');
      time.className = 'history-time';
      time.textContent = formatTime(item.timestamp);
      const icons = document.createElement('div');
      icons.className = 'history-icons';
      for (const t of item.runeTypes) {
        const def = RUNE_DEFINITIONS[t];
        const ic = document.createElement('div');
        ic.className = 'history-icon';
        ic.textContent = def.symbol;
        ic.style.color = def.color;
        ic.style.background = def.color + '33';
        icons.appendChild(ic);
      }
      const tag = document.createElement('span');
      tag.className = 'history-tag ' + (item.isCombo ? 'tag-combo' : 'tag-success');
      tag.textContent = item.effectName;
      div.appendChild(time);
      div.appendChild(icons);
      div.appendChild(tag);
      list.appendChild(div);
    }
  }

  function updateStatsUI() {
    const drawn = document.getElementById('stat-drawn');
    const success = document.getElementById('stat-success');
    const acc = document.getElementById('stat-accuracy');
    const released = document.getElementById('stat-released');
    const combo = document.getElementById('stat-combo');
    if (drawn) drawn.textContent = String(stats.totalDrawn);
    if (success) success.textContent = String(stats.successfulMatches);
    const accuracy = stats.totalDrawn > 0 ? Math.round((stats.successfulMatches / stats.totalDrawn) * 100) : 0;
    if (acc) acc.textContent = `${accuracy}%`;
    if (released) released.textContent = String(stats.totalReleased);
    if (combo) combo.textContent = String(stats.maxComboLength);
  }
};

function initStarfield() {
  const sf = document.getElementById('starfield');
  if (!sf) return;
  for (let i = 0; i < 150; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 3) + 's';
    s.style.animationDuration = (2 + Math.random() * 3) + 's';
    sf.appendChild(s);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initStarfield();

  const threeCanvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  threeScene = new MagicScene(threeCanvas);
  threeScene.start();

  new p5(sketch);
});
