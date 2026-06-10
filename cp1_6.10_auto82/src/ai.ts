import {
  Stone,
  getHouseCenter,
  OUTER_RING_RADIUS,
  INNER_RING_RADIUS,
  MIDDLE_RING_RADIUS,
  STONE_RADIUS,
  TRACK_WIDTH,
} from './physics';

export interface AIDecision {
  angle: number;
  power: number;
}

export function calculateAIDecision(
  stones: Stone[],
  startX: number,
  startY: number
): AIDecision {
  const house = getHouseCenter('far');
  const enemyTeam: 'red' | 'yellow' = 'red';
  const aiTeam: 'red' | 'yellow' = 'yellow';

  const enemyStones = stones.filter(
    (s) => s.team === enemyTeam && !s.isMoving
  );
  const aiStones = stones.filter((s) => s.team === aiTeam && !s.isMoving);

  let bestScore = -Infinity;
  let bestAngle = -Math.PI / 2;
  let bestPower = 60;

  for (let angleDeg = 60; angleDeg <= 120; angleDeg += 0.5) {
    const angle = (angleDeg - 90) * (Math.PI / 180);
    for (let power = 20; power <= 100; power += 2) {
      const score = simulateShot(
        startX,
        startY,
        angle,
        power,
        stones,
        house,
        aiTeam,
        enemyTeam,
        enemyStones,
        aiStones
      );

      if (score > bestScore) {
        bestScore = score;
        bestAngle = angle;
        bestPower = power;
      }
    }
  }

  const angleError = (Math.random() - 0.5) * 4 * (Math.PI / 180);
  const powerError = power * (Math.random() - 0.5) * 0.1;

  return {
    angle: bestAngle + angleError,
    power: Math.max(5, Math.min(100, bestPower + powerError)),
  };
}

function simulateShot(
  startX: number,
  startY: number,
  angle: number,
  power: number,
  stones: Stone[],
  house: { x: number; y: number },
  aiTeam: 'red' | 'yellow',
  enemyTeam: 'red' | 'yellow',
  enemyStones: Stone[],
  aiStones: Stone[]
): number {
  let score = 0;
  const speed = power * 0.8;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;
  let x = startX;
  let y = startY;
  let angularVelocity = -(power / 100) * 0.5;

  const simulatedStones = stones.map((s) => ({ ...s }));

  let simulatedEndX = x;
  let simulatedEndY = y;
  let hitEnemyStone = false;
  let pushedEnemyOut = false;
  let landedInHouse = false;

  const maxSteps = 2000;
  for (let step = 0; step < maxSteps; step++) {
    if (Math.abs(angularVelocity) > 0.001) {
      const sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > 0.1) {
        const curvature = angularVelocity * 0.02;
        const a = Math.atan2(vy, vx) + curvature;
        vx = Math.cos(a) * sp;
        vy = Math.sin(a) * sp;
      }
    }

    x += vx;
    y += vy;

    const sp = Math.sqrt(vx * vx + vy * vy);
    if (sp < 0.01) break;
    const deceleration = 0.02;
    const newSpeed = Math.max(0, sp - deceleration);
    const ratio = newSpeed / sp;
    vx *= ratio;
    vy *= ratio;
    angularVelocity *= 0.995;

    const leftBound = 50;
    const rightBound = TRACK_WIDTH - 50;
    if (x - STONE_RADIUS < leftBound) {
      x = leftBound + STONE_RADIUS;
      vx = Math.abs(vx) * 0.8;
    } else if (x + STONE_RADIUS > rightBound) {
      x = rightBound - STONE_RADIUS;
      vx = -Math.abs(vx) * 0.8;
    }
    if (y - STONE_RADIUS < 50) {
      y = 50 + STONE_RADIUS;
      vy = Math.abs(vy) * 0.8;
    } else if (y + STONE_RADIUS > startY + 50) {
      break;
    }

    for (const s of simulatedStones) {
      const dx = x - s.x;
      const dy = y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < STONE_RADIUS * 2 && dist > 0) {
        if (s.team === enemyTeam) {
          hitEnemyStone = true;
          const sdx = s.x - house.x;
          const sdy = s.y - house.y;
          const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
          if (sDist <= OUTER_RING_RADIUS) {
            pushedEnemyOut = true;
          }
        }
        const nx = dx / dist;
        const ny = dy / dist;
        const dvn = vx * nx + vy * ny;
        if (dvn > 0) {
          const impulse = dvn * 0.8;
          vx -= impulse * nx;
          vy -= impulse * ny;
        }
      }
    }

    simulatedEndX = x;
    simulatedEndY = y;
  }

  const endDist = Math.sqrt(
    Math.pow(simulatedEndX - house.x, 2) + Math.pow(simulatedEndY - house.y, 2)
  );
  if (endDist <= INNER_RING_RADIUS) {
    score += 100;
    landedInHouse = true;
  } else if (endDist <= MIDDLE_RING_RADIUS) {
    score += 70;
    landedInHouse = true;
  } else if (endDist <= OUTER_RING_RADIUS) {
    score += 40;
    landedInHouse = true;
  } else if (endDist <= OUTER_RING_RADIUS + 100) {
    score += 10;
  }

  if (pushedEnemyOut) {
    score += 80;
  } else if (hitEnemyStone) {
    score += 20;
  }

  let closestEnemyDist = Infinity;
  for (const s of enemyStones) {
    const dist = Math.sqrt(
      Math.pow(s.x - house.x, 2) + Math.pow(s.y - house.y, 2)
    );
    if (dist < closestEnemyDist) closestEnemyDist = dist;
  }

  let closestAIDist = endDist;
  for (const s of aiStones) {
    const dist = Math.sqrt(
      Math.pow(s.x - house.x, 2) + Math.pow(s.y - house.y, 2)
    );
    if (dist < closestAIDist) closestAIDist = dist;
  }

  if (landedInHouse && closestAIDist < closestEnemyDist) {
    score += 60;
  }

  score -= Math.abs(power - 60) * 0.1;

  return score;
}
