import Matter from 'matter-js';

const { Engine, World, Runner, Bodies, Composite, Events, Detector } = Matter;

export interface CollisionEvent {
  bodyA: Matter.Body;
  bodyB: Matter.Body;
  velocity: number;
  normal: Matter.Vector;
}

export class PhysicsEngine {
  public engine: Matter.Engine;
  public world: Matter.World;
  public runner: Matter.Runner;
  private lastTime: number = 0;
  private fixedTimestep: number = 1000 / 60;
  private accumulator: number = 0;
  private collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
  private updateCallbacks: ((delta: number) => void)[] = [];

  constructor() {
    this.engine = Engine.create({
      gravity: {
        x: 0,
        y: 1,
        scale: 0.0015
      },
      enableSleeping: false
    });

    this.world = this.engine.world;
    this.runner = Runner.create();

    (this.engine as any).broadphase = 'bvhtree';

    Events.on(this.engine, 'collisionStart', (event) => {
      this.handleCollision(event);
    });
  }

  public start(): void {
    this.lastTime = performance.now();
    this.accumulator = 0;
    Runner.run(this.runner, this.engine);

    const loop = () => {
      const now = performance.now();
      let frameTime = now - this.lastTime;
      this.lastTime = now;

      if (frameTime > 100) frameTime = 100;

      this.accumulator += frameTime;

      while (this.accumulator >= this.fixedTimestep) {
        for (const cb of this.updateCallbacks) {
          cb(this.fixedTimestep);
        }
        this.accumulator -= this.fixedTimestep;
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  public stop(): void {
    Runner.stop(this.runner);
  }

  public addBody(body: Matter.Body): void {
    World.add(this.world, body);
  }

  public addBodies(bodies: Matter.Body[]): void {
    World.add(this.world, bodies);
  }

  public removeBody(body: Matter.Body): void {
    Composite.remove(this.world, body);
  }

  public removeBodies(bodies: Matter.Body[]): void {
    for (const body of bodies) {
      if (Composite.has(this.world, body)) {
        Composite.remove(this.world, body);
      }
    }
  }

  public onCollision(callback: (event: CollisionEvent) => void): void {
    this.collisionCallbacks.push(callback);
  }

  public onUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  private handleCollision(event: Matter.IEventCollision<Matter.Engine>): void {
    for (const pair of event.pairs) {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      const velA = bodyA.velocity;
      const velB = bodyB.velocity;
      const relVel = {
        x: velA.x - velB.x,
        y: velA.y - velB.y
      };
      const velocity = Math.sqrt(relVel.x * relVel.x + relVel.y * relVel.y);

      const normal = pair.collision.normal;

      const collisionEvent: CollisionEvent = {
        bodyA,
        bodyB,
        velocity,
        normal: { x: normal.x, y: normal.y }
      };

      for (const cb of this.collisionCallbacks) {
        cb(collisionEvent);
      }
    }
  }

  public applyImpulse(body: Matter.Body, impulse: Matter.Vector): void {
    Matter.Body.applyForce(body, body.position, impulse);
  }

  public setVelocity(body: Matter.Body, velocity: Matter.Vector): void {
    Matter.Body.setVelocity(body, velocity);
  }

  public setPosition(body: Matter.Body, position: Matter.Vector): void {
    Matter.Body.setPosition(body, position);
  }

  public setStatic(body: Matter.Body, isStatic: boolean): void {
    Matter.Body.setStatic(body, isStatic);
  }

  public clearAll(): void {
    const allBodies = Composite.allBodies(this.world);
    for (const body of allBodies) {
      Composite.remove(this.world, body);
    }
    this.collisionCallbacks = [];
    this.updateCallbacks = [];
  }

  public predictTrajectory(
    startX: number,
    startY: number,
    velocityX: number,
    velocityY: number,
    steps: number = 150,
    stepMs: number = 16
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const gravityY = this.engine.gravity.y * this.engine.gravity.scale;

    let x = startX;
    let y = startY;
    let vx = velocityX;
    let vy = velocityY;

    const dt = stepMs / 1000;

    for (let i = 0; i < steps; i++) {
      x += vx * dt * 60;
      y += vy * dt * 60;
      vy += gravityY * 60 * dt * 60;
      vx *= 0.998;
      vy *= 0.998;

      if (i % 5 === 0) {
        points.push({ x, y });
      }
    }

    return points;
  }
}
