import { z } from 'zod';

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

export const AntRoleSchema = z.enum(['player', 'friendly', 'enemy']);
export type AntRole = z.infer<typeof AntRoleSchema>;

export const AntStateSchema = z.enum(['exploring', 'following_pheromone', 'carrying_food', 'returning', 'idle']);
export type AntState = z.infer<typeof AntStateSchema>;

export const FoodTypeSchema = z.enum(['sugar', 'protein']);
export type FoodType = z.infer<typeof FoodTypeSchema>;

export const PheromoneTypeSchema = z.enum(['friendly', 'enemy']);
export type PheromoneType = z.infer<typeof PheromoneTypeSchema>;

export const AntSchema = z.object({
  id: z.string(),
  role: AntRoleSchema,
  state: AntStateSchema,
  position: PositionSchema,
  velocity: PositionSchema,
  angle: z.number(),
  size: z.number(),
  speed: z.number(),
  carryingFood: z.boolean(),
  carryingFoodType: FoodTypeSchema.nullable(),
  antennaPhase: z.number(),
  pheromoneTimer: z.number(),
  targetPosition: PositionSchema.nullable(),
  waypointId: z.string().nullable(),
});
export type Ant = z.infer<typeof AntSchema>;

export const PheromoneSchema = z.object({
  id: z.string(),
  type: PheromoneTypeSchema,
  position: PositionSchema,
  strength: z.number(),
  maxStrength: z.number(),
  decayRate: z.number(),
  age: z.number(),
});
export type Pheromone = z.infer<typeof PheromoneSchema>;

export const FoodSourceSchema = z.object({
  id: z.string(),
  type: FoodTypeSchema,
  position: PositionSchema,
  size: z.number(),
  amount: z.number(),
  maxAmount: z.number(),
  collected: z.boolean(),
  glowPhase: z.number(),
});
export type FoodSource = z.infer<typeof FoodSourceSchema>;

export const RoomSchema = z.object({
  id: z.string(),
  center: PositionSchema,
  radius: z.number(),
  connectedTunnelIds: z.array(z.string()),
});
export type Room = z.infer<typeof RoomSchema>;

export const TunnelSchema = z.object({
  id: z.string(),
  start: PositionSchema,
  end: PositionSchema,
  width: z.number(),
  connectedRoomIds: z.array(z.string()),
});
export type Tunnel = z.infer<typeof TunnelSchema>;

export const WaypointSchema = z.object({
  id: z.string(),
  position: PositionSchema,
  createdAt: z.number(),
  ttl: z.number(),
});
export type Waypoint = z.infer<typeof WaypointSchema>;

export const ParticleSchema = z.object({
  id: z.string(),
  position: PositionSchema,
  velocity: PositionSchema,
  size: z.number(),
  opacity: z.number(),
  life: z.number(),
  maxLife: z.number(),
  color: z.string(),
  type: z.enum(['bubble', 'collection', 'clash']),
});
export type Particle = z.infer<typeof ParticleSchema>;

export const NestSchema = z.object({
  center: PositionSchema,
  radius: z.number(),
});
export type Nest = z.infer<typeof NestSchema>;

export const GameStateSchema = z.object({
  ants: z.array(AntSchema),
  pheromones: z.array(PheromoneSchema),
  foodSources: z.array(FoodSourceSchema),
  rooms: z.array(RoomSchema),
  tunnels: z.array(TunnelSchema),
  waypoints: z.array(WaypointSchema),
  particles: z.array(ParticleSchema),
  nest: NestSchema,
  playerAntId: z.string(),
  zoom: z.number(),
  cameraOffset: PositionSchema,
  score: z.object({
    friendly: z.number(),
    enemy: z.number(),
  }),
  time: z.number(),
  running: z.boolean(),
});
export type GameState = z.infer<typeof GameStateSchema>;

export const PHEROMONE_GRID_SIZE = 8;
export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1600;

export interface InputState {
  keys: Set<string>;
  mousePosition: Position;
  rightClickPosition: Position | null;
  scrollDelta: number;
}
