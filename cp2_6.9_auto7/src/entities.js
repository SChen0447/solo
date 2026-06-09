export function createShip(canvasWidth, canvasHeight) {
    return {
        x: canvasWidth * 0.15,
        y: canvasHeight * 0.5,
        radius: 18,
        speed: 5,
        boosting: false
    };
}
export function createStar(canvasWidth, canvasHeight) {
    return {
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2
    };
}
function obstacleColor() {
    const colors = ['#ff6b35', '#e74c3c', '#c0392b', '#9b59b6', '#8e44ad'];
    return colors[Math.floor(Math.random() * colors.length)];
}
export function createObstacle(canvasWidth, canvasHeight) {
    const shape = Math.random() > 0.5 ? 'rect' : 'triangle';
    const width = Math.random() * 40 + 30;
    const height = Math.random() * 60 + 40;
    return {
        x: canvasWidth + width,
        y: Math.random() * (canvasHeight - height - 40) + 20,
        width,
        height,
        shape,
        color: obstacleColor(),
        active: true
    };
}
export function createPowerUp(canvasWidth, canvasHeight) {
    return {
        x: canvasWidth + 30,
        y: Math.random() * (canvasHeight - 100) + 50,
        radius: 16,
        active: true,
        pulsePhase: 0
    };
}
export function createParticle() {
    return {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        active: false
    };
}
export function resetParticle(p, x, y, vx, vy, life) {
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.active = true;
}
export function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
}
export function circleTriangleCollision(cx, cy, cr, tx, ty, tw, th) {
    const p1 = { x: tx, y: ty + th };
    const p2 = { x: tx + tw, y: ty + th };
    const p3 = { x: tx + tw / 2, y: ty };
    if (pointInTriangle(cx, cy, p1, p2, p3))
        return true;
    if (circleLineCollision(cx, cy, cr, p1.x, p1.y, p2.x, p2.y))
        return true;
    if (circleLineCollision(cx, cy, cr, p2.x, p2.y, p3.x, p3.y))
        return true;
    if (circleLineCollision(cx, cy, cr, p3.x, p3.y, p1.x, p1.y))
        return true;
    return false;
}
function pointInTriangle(px, py, p1, p2, p3) {
    const d1 = sign(px, py, p1.x, p1.y, p2.x, p2.y);
    const d2 = sign(px, py, p2.x, p2.y, p3.x, p3.y);
    const d3 = sign(px, py, p3.x, p3.y, p1.x, p1.y);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
}
function sign(px, py, x1, y1, x2, y2) {
    return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}
function circleLineCollision(cx, cy, cr, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - cr * cr;
    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0)
        return false;
    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);
    if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1))
        return true;
    return false;
}
export function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}
export function checkShipObstacleCollision(ship, obstacle) {
    if (obstacle.shape === 'rect') {
        return circleRectCollision(ship.x, ship.y, ship.radius, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
    else {
        return circleTriangleCollision(ship.x, ship.y, ship.radius, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
}
