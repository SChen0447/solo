import { Poolable } from '../types';

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, maxSize: number = 200) {
    this.factory = factory;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let obj = this.pool.find((p) => !p.active);
    if (!obj) {
      if (this.pool.length < this.maxSize) {
        obj = this.factory();
        this.pool.push(obj);
      } else {
        obj = this.pool.find((p) => !p.active) || this.pool[0];
      }
    }
    obj.active = true;
    return obj;
  }

  release(obj: T): void {
    obj.active = false;
  }

  getActive(): T[] {
    return this.pool.filter((p) => p.active);
  }

  getAll(): T[] {
    return this.pool;
  }

  clear(): void {
    this.pool.forEach((p) => (p.active = false));
  }

  get size(): number {
    return this.pool.length;
  }
}
