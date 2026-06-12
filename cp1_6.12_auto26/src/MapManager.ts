import { Tile, TileType, Player, MAP_SIZE, TILE_SIZE, BASE_ENCOUNTER_RATE, MAX_ENCOUNTER_RATE, ENCOUNTER_RATE_INCREMENT, POKEMON_DATA, Pokemon } from './types';

export class MapManager {
  private map: Tile[][] = [];
  private player: Player;
  private onEncounter: ((pokemon: Pokemon) => void) | null = null;
  private animationFrame: number = 0;
  private lastMoveTime: number = 0;
  private moveCooldown: number = 120;
  private flashFrame: number = 0;
  private isFlashing: boolean = false;

  constructor() {
    this.player = {
      x: Math.floor(MAP_SIZE / 2),
      y: Math.floor(MAP_SIZE / 2),
      direction: 'down',
      team: [this.createStarterPokemon()],
      stepsInGrass: 0
    };
    this.generateMap();
  }

  private createStarterPokemon(): Pokemon {
    const data = POKEMON_DATA[Math.floor(Math.random() * POKEMON_DATA.length)];
    const level = 5;
    return {
      id: 'starter-' + Date.now(),
      name: data.name,
      element: data.element,
      level,
      maxHp: Math.floor(data.baseHp + (level - 1) * 3),
      currentHp: Math.floor(data.baseHp + (level - 1) * 3),
      attack: Math.floor(data.baseAttack + (level - 1) * 2),
      defense: Math.floor(data.baseDefense + (level - 1) * 1.5),
      spriteFrame: 0
    };
  }

  private generateMap(): void {
    this.map = [];
    
    for (let y = 0; y < MAP_SIZE; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < MAP_SIZE; x++) {
        row.push(this.generateTile(x, y));
      }
      this.map.push(row);
    }
    
    this.generatePath();
    this.generateWater();
    this.generateTrees();
    
    const startX = Math.floor(MAP_SIZE / 2);
    const startY = Math.floor(MAP_SIZE / 2);
    this.map[startY][startX] = { type: 'path', variant: 0 };
  }

  private generateTile(x: number, y: number): Tile {
    const noise = this.simpleNoise(x, y);
    if (noise > 0.6) {
      return { type: 'tallGrass', variant: Math.floor(Math.random() * 4) };
    } else {
      return { type: 'grass', variant: Math.floor(Math.random() * 3) };
    }
  }

  private simpleNoise(x: number, y: number): number {
    const seed = x * 12.9898 + y * 78.233;
    return (Math.sin(seed) * 43758.5453) % 1;
  }

  private generatePath(): void {
    let x = Math.floor(MAP_SIZE / 2);
    let y = 0;
    
    while (y < MAP_SIZE) {
      if (x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) {
        this.map[y][x] = { type: 'path', variant: Math.floor(Math.random() * 2) };
        if (x + 1 < MAP_SIZE) {
          this.map[y][x + 1] = { type: 'path', variant: Math.floor(Math.random() * 2) };
        }
      }
      
      if (Math.random() < 0.3) {
        x += Math.random() < 0.5 ? 1 : -1;
        x = Math.max(1, Math.min(MAP_SIZE - 2, x));
      }
      y++;
    }
  }

  private generateWater(): void {
    const waterCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < waterCount; i++) {
      const centerX = Math.floor(Math.random() * MAP_SIZE);
      const centerY = Math.floor(Math.random() * MAP_SIZE);
      const size = 3 + Math.floor(Math.random() * 5);
      
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < size * 0.7 + Math.random() * 0.5) {
              this.map[y][x] = { type: 'water', variant: Math.floor(Math.random() * 3) };
            }
          }
        }
      }
    }
  }

  private generateTrees(): void {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (this.map[y][x].type === 'grass' && Math.random() < 0.05) {
          this.map[y][x] = { type: 'tree', variant: Math.floor(Math.random() * 2) };
        }
      }
    }
    
    for (let i = 0; i < MAP_SIZE; i++) {
      this.map[0][i] = { type: 'tree', variant: 0 };
      this.map[MAP_SIZE - 1][i] = { type: 'tree', variant: 0 };
      this.map[i][0] = { type: 'tree', variant: 0 };
      this.map[i][MAP_SIZE - 1] = { type: 'tree', variant: 0 };
    }
  }

  public setOnEncounter(callback: (pokemon: Pokemon) => void): void {
    this.onEncounter = callback;
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getMap(): Tile[][] {
    return this.map;
  }

  public getAnimationFrame(): number {
    return this.animationFrame;
  }

  public getFlashFrame(): number {
    return this.flashFrame;
  }

  public getIsFlashing(): boolean {
    return this.isFlashing;
  }

  public update(deltaTime: number): void {
    this.animationFrame += deltaTime * 0.01;
    
    if (this.isFlashing) {
      this.flashFrame += deltaTime * 0.02;
      if (this.flashFrame >= 3) {
        this.isFlashing = false;
        this.flashFrame = 0;
      }
    }
  }

  public movePlayer(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    const now = Date.now();
    if (now - this.lastMoveTime < this.moveCooldown) {
      return false;
    }
    
    this.player.direction = direction;
    
    let newX = this.player.x;
    let newY = this.player.y;
    
    switch (direction) {
      case 'up': newY--; break;
      case 'down': newY++; break;
      case 'left': newX--; break;
      case 'right': newX++; break;
    }
    
    if (newX < 0 || newX >= MAP_SIZE || newY < 0 || newY >= MAP_SIZE) {
      return false;
    }
    
    const tile = this.map[newY][newX];
    if (tile.type === 'tree' || tile.type === 'water') {
      return false;
    }
    
    this.player.x = newX;
    this.player.y = newY;
    this.lastMoveTime = now;
    
    if (tile.type === 'tallGrass') {
      this.player.stepsInGrass++;
      this.checkEncounter();
    } else {
      this.player.stepsInGrass = 0;
    }
    
    return true;
  }

  private checkEncounter(): void {
    const rate = Math.min(
      BASE_ENCOUNTER_RATE + this.player.stepsInGrass * ENCOUNTER_RATE_INCREMENT,
      MAX_ENCOUNTER_RATE
    );
    
    if (Math.random() < rate) {
      this.player.stepsInGrass = 0;
      this.isFlashing = true;
      this.flashFrame = 0;
      
      const pokemon = this.generateWildPokemon();
      
      setTimeout(() => {
        if (this.onEncounter) {
          this.onEncounter(pokemon);
        }
      }, 500);
    }
  }

  private generateWildPokemon(): Pokemon {
    const data = POKEMON_DATA[Math.floor(Math.random() * POKEMON_DATA.length)];
    const level = 3 + Math.floor(Math.random() * 8);
    
    return {
      id: 'wild-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      name: data.name,
      element: data.element,
      level,
      maxHp: Math.floor(data.baseHp + (level - 1) * 3),
      currentHp: Math.floor(data.baseHp + (level - 1) * 3),
      attack: Math.floor(data.baseAttack + (level - 1) * 2),
      defense: Math.floor(data.baseDefense + (level - 1) * 1.5),
      spriteFrame: 0
    };
  }

  public getCameraOffset(): { x: number; y: number } {
    const viewWidth = 30;
    const viewHeight = 20;
    
    let cameraX = this.player.x - Math.floor(viewWidth / 2);
    let cameraY = this.player.y - Math.floor(viewHeight / 2);
    
    cameraX = Math.max(0, Math.min(MAP_SIZE - viewWidth, cameraX));
    cameraY = Math.max(0, Math.min(MAP_SIZE - viewHeight, cameraY));
    
    return { x: cameraX * TILE_SIZE, y: cameraY * TILE_SIZE };
  }

  public addToTeam(pokemon: Pokemon): boolean {
    if (this.player.team.length >= 6) {
      return false;
    }
    this.player.team.push(pokemon);
    return true;
  }

  public removeFromTeam(index: number): boolean {
    if (index < 0 || index >= this.player.team.length) {
      return false;
    }
    if (this.player.team.length <= 1) {
      return false;
    }
    this.player.team.splice(index, 1);
    return true;
  }

  public getTeam(): Pokemon[] {
    return this.player.team;
  }

  public getFirstAlivePokemon(): Pokemon | null {
    for (const pokemon of this.player.team) {
      if (pokemon.currentHp > 0) {
        return pokemon;
      }
    }
    return null;
  }
}
