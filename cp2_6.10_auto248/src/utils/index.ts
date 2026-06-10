import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import type { Vec2, ResourcePool, ResourceCapacity, ResourceType } from '../types';
import { GRID_SIZE } from '../constants';

export function uid(): string {
  return uuidv4();
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function canAfford(resources: ResourcePool, costs: Partial<Record<ResourceType, number>>): boolean {
  return Object.entries(costs).every(([key, value]) => {
    const k = key as ResourceType;
    return resources[k] >= (value || 0);
  });
}

export function spendResources(resources: ResourcePool, costs: Partial<Record<ResourceType, number>>): ResourcePool {
  const result = { ...resources };
  Object.entries(costs).forEach(([key, value]) => {
    const k = key as ResourceType;
    result[k] -= value || 0;
  });
  return result;
}

export function addResource(
  resources: ResourcePool,
  capacities: ResourceCapacity,
  type: ResourceType,
  amount: number
): ResourcePool {
  const result = { ...resources };
  result[type] = clamp(result[type] + amount, 0, capacities[type]);
  return result;
}

export function deepClone<T>(obj: T): T {
  return _.cloneDeep(obj);
}

export function moveTowards(cur: number, target: number, step: number): number {
  if (Math.abs(target - cur) <= step) return target;
  return cur < target ? cur + step : cur - step;
}

export function moveVecTowards(cur: Vec2, target: Vec2, step: number): Vec2 {
  const dx = target.x - cur.x;
  const dy = target.y - cur.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= step) return { x: target.x, y: target.y };
  return { x: cur.x + (dx / d) * step, y: cur.y + (dy / d) * step };
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
