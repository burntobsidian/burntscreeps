import { MemoryManager } from "../core/MemoryManager";
import { Constants } from "../core/Constants";

export interface RoomAnalysis {
  roomName: string;
  roomType: string;
  controller: {
    level: number;
    owner?: string;
    reservation?: {
      username: string;
      ticksToEnd: number;
    };
    upgradeBlocked?: number;
  };
  sources: Array<{
    id: string;
    pos: RoomPosition;
    energyCapacity: number;
    containerPos?: RoomPosition;
    linkPos?: RoomPosition;
    efficiency: number;
  }>;
  minerals: Array<{
    id: string;
    pos: RoomPosition;
    mineralType: string;
    density: number;
  }>;
  structures: {
    spawns: number;
    extensions: number;
    towers: number;
    storage: boolean;
    terminal: boolean;
    labs: number;
    factories: number;
  };
  threats: Array<{
    creepName: string;
    owner: string;
    pos: RoomPosition;
    bodyParts: string[];
    lastSeen: number;
    threatLevel: number;
  }>;
  economy: {
    energyCapacity: number;
    energyAvailable: number;
    energyIncome: number;
    energyExpenditure: number;
    efficiency: number;
  };
  military: {
    defenseRating: number;
    offenseRating: number;
    isUnderAttack: boolean;
    safeMode: boolean;
    ramparts: number;
  };
  pathingData: {
    terrain: number[][];
    swampCount: number;
    plainCount: number;
    wallCount: number;
  };
}

export class RoomIntelligence {
  static analyze(room: Room): RoomAnalysis {
    const roomName = room.name;
    const cached = MemoryManager.getCache(roomName, 'analysis');
    
    if (cached && Game.time % 10 !== 0) {
      return cached;
    }

    const analysis = this.performAnalysis(room);
    MemoryManager.setCache(roomName, 'analysis', analysis, Constants.CACHE_TTL.ROOM_INTEL);
    
    const roomMemory = MemoryManager.getRoomMemory(roomName);
    this.updateRoomMemory(roomMemory, analysis);
    
    return analysis;
  }

  private static performAnalysis(room: Room): RoomAnalysis {
    const analysis: RoomAnalysis = {
      roomName: room.name,
      roomType: this.determineRoomType(room),
      controller: this.analyzeController(room),
      sources: this.analyzeSources(room),
      minerals: this.analyzeMinerals(room),
      structures: this.analyzeStructures(room),
      threats: this.analyzeThreats(room),
      economy: this.analyzeEconomy(room),
      military: this.analyzeMilitary(room),
      pathingData: this.analyzePathing(room)
    };

    return analysis;
  }

  private static determineRoomType(room: Room): string {
    if (room.controller?.my) return Constants.ROOM_TYPES.OWNED;
    if (room.controller?.owner) return Constants.ROOM_TYPES.HOSTILE;
    if (room.controller?.reservation?.username === "SlowMotionGhost") return Constants.ROOM_TYPES.RESERVED;
    
    const parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(room.name);
    if (parsed) {
      const x = parseInt(parsed[1]);
      const y = parseInt(parsed[2]);
      if (x % 10 === 0 || y % 10 === 0) return Constants.ROOM_TYPES.HIGHWAY;
      if ((x % 10 === 5 && y % 10 === 5)) return Constants.ROOM_TYPES.SOURCE_KEEPER;
    }
    
    return Constants.ROOM_TYPES.NEUTRAL;
  }

  private static analyzeController(room: Room): any {
    if (!room.controller) return {};
    
    return {
      level: room.controller.level || 0,
      owner: room.controller.owner?.username,
      reservation: room.controller.reservation ? {
        username: room.controller.reservation.username,
        ticksToEnd: room.controller.reservation.ticksToEnd
      } : undefined,
      upgradeBlocked: room.controller.upgradeBlocked
    };
  }

  private static analyzeSources(room: Room): any[] {
    const sources = room.find(FIND_SOURCES);
    return sources.map(source => {
      const terrain = new Room.Terrain(room.name);
      const adjacentSpots = this.getAdjacentPositions(source.pos)
        .filter(pos => terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL);
      
      const efficiency = adjacentSpots.length / 8; // Max 8 adjacent spots
      
      return {
        id: source.id,
        pos: source.pos,
        energyCapacity: source.energyCapacity,
        efficiency,
        containerPos: this.findOptimalContainerPosition(source, room),
        linkPos: this.findOptimalLinkPosition(source, room)
      };
    });
  }

  private static analyzeMinerals(room: Room): any[] {
    const minerals = room.find(FIND_MINERALS);
    return minerals.map(mineral => ({
      id: mineral.id,
      pos: mineral.pos,
      mineralType: mineral.mineralType,
      density: mineral.density || 0
    }));
  }

  private static analyzeStructures(room: Room): any {
    const structures = room.find(FIND_STRUCTURES);
    const structureCount = {
      spawns: 0,
      extensions: 0,
      towers: 0,
      storage: false,
      terminal: false,
      labs: 0,
      factories: 0
    };

    structures.forEach(structure => {
      switch (structure.structureType) {
        case STRUCTURE_SPAWN:
          structureCount.spawns++;
          break;
        case STRUCTURE_EXTENSION:
          structureCount.extensions++;
          break;
        case STRUCTURE_TOWER:
          structureCount.towers++;
          break;
        case STRUCTURE_STORAGE:
          structureCount.storage = true;
          break;
        case STRUCTURE_TERMINAL:
          structureCount.terminal = true;
          break;
        case STRUCTURE_LAB:
          structureCount.labs++;
          break;
        case STRUCTURE_FACTORY:
          structureCount.factories++;
          break;
      }
    });

    return structureCount;
  }

  private static analyzeThreats(room: Room): any[] {
    const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
    return hostileCreeps.map(creep => {
      const bodyParts = creep.body.map(part => part.type);
      const attackParts = bodyParts.filter(part => 
        part === ATTACK || part === RANGED_ATTACK || part === HEAL
      ).length;
      
      return {
        creepName: creep.name,
        owner: creep.owner.username,
        pos: creep.pos,
        bodyParts,
        lastSeen: Game.time,
        threatLevel: this.calculateThreatLevel(bodyParts, attackParts)
      };
    });
  }

  private static analyzeEconomy(room: Room): any {
    const energyCapacity = room.energyCapacityAvailable;
    const energyAvailable = room.energyAvailable;
    
    const storage = room.storage;
    const terminal = room.terminal;
    
    let totalEnergy = energyAvailable;
    if (storage) totalEnergy += storage.store[RESOURCE_ENERGY] || 0;
    if (terminal) totalEnergy += terminal.store[RESOURCE_ENERGY] || 0;
    
    const efficiency = energyCapacity > 0 ? energyAvailable / energyCapacity : 0;
    
    return {
      energyCapacity,
      energyAvailable,
      energyIncome: this.calculateEnergyIncome(room),
      energyExpenditure: this.calculateEnergyExpenditure(room),
      efficiency
    };
  }

  private static analyzeMilitary(room: Room): any {
    const towers = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_TOWER }
    }) as StructureTower[];
    
    const ramparts = room.find(FIND_STRUCTURES, {
      filter: { structureType: STRUCTURE_RAMPART }
    });
    
    const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
    const defenseRating = towers.length * 100 + ramparts.length * 10;
    
    return {
      defenseRating,
      offenseRating: this.calculateOffenseRating(room),
      isUnderAttack: hostileCreeps.length > 0,
      safeMode: room.controller?.safeMode || 0,
      ramparts: ramparts.length
    };
  }

  private static analyzePathing(room: Room): any {
    const terrain = new Room.Terrain(room.name);
    const pathingData = {
      terrain: [] as number[][],
      swampCount: 0,
      plainCount: 0,
      wallCount: 0
    };
    
    for (let x = 0; x < 50; x++) {
      pathingData.terrain[x] = [];
      for (let y = 0; y < 50; y++) {
        const terrainType = terrain.get(x, y);
        pathingData.terrain[x][y] = terrainType;
        
        if (terrainType === TERRAIN_MASK_WALL) pathingData.wallCount++;
        else if (terrainType === TERRAIN_MASK_SWAMP) pathingData.swampCount++;
        else pathingData.plainCount++;
      }
    }
    
    return pathingData;
  }

  private static getAdjacentPositions(pos: RoomPosition): RoomPosition[] {
    const positions = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (x >= 0 && x < 50 && y >= 0 && y < 50) {
          positions.push(new RoomPosition(x, y, pos.roomName));
        }
      }
    }
    return positions;
  }

  private static findOptimalContainerPosition(source: Source, room: Room): RoomPosition | undefined {
    const adjacentPositions = this.getAdjacentPositions(source.pos);
    const terrain = new Room.Terrain(room.name);
    
    return adjacentPositions.find(pos => 
      terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL &&
      !pos.lookFor(LOOK_STRUCTURES).length
    );
  }

  private static findOptimalLinkPosition(source: Source, room: Room): RoomPosition | undefined {
    if (!room.controller?.my || room.controller.level < 5) return undefined;
    
    const controller = room.controller;
    const adjacentPositions = this.getAdjacentPositions(source.pos);
    const terrain = new Room.Terrain(room.name);
    
    return adjacentPositions
      .filter(pos => terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL)
      .sort((a, b) => a.getRangeTo(controller) - b.getRangeTo(controller))[0];
  }

  private static calculateThreatLevel(bodyParts: string[], attackParts: number): number {
    const totalParts = bodyParts.length;
    const ratio = attackParts / totalParts;
    
    if (ratio > 0.5) return 5; // High threat
    if (ratio > 0.3) return 4; // Medium-high threat
    if (ratio > 0.1) return 3; // Medium threat
    if (attackParts > 0) return 2; // Low threat
    return 1; // Minimal threat
  }

  private static calculateEnergyIncome(room: Room): number {
    const sources = room.find(FIND_SOURCES);
    return sources.reduce((total, source) => total + source.energyCapacity, 0) / 300;
  }

  private static calculateEnergyExpenditure(room: Room): number {
    const creeps = room.find(FIND_MY_CREEPS);
    return creeps.reduce((total, creep) => {
      return total + creep.body.reduce((bodyTotal, part) => {
        switch (part.type) {
          case WORK: return bodyTotal + 100;
          case CARRY: return bodyTotal + 50;
          case MOVE: return bodyTotal + 50;
          case ATTACK: return bodyTotal + 80;
          case RANGED_ATTACK: return bodyTotal + 150;
          case HEAL: return bodyTotal + 250;
          default: return bodyTotal + 50;
        }
      }, 0);
    }, 0);
  }

  private static calculateOffenseRating(room: Room): number {
    const creeps = room.find(FIND_MY_CREEPS);
    return creeps.reduce((total, creep) => {
      const attackParts = creep.body.filter(part => 
        part.type === ATTACK || part.type === RANGED_ATTACK
      ).length;
      return total + attackParts * 30;
    }, 0);
  }

  private static updateRoomMemory(roomMemory: any, analysis: RoomAnalysis): void {
    roomMemory.controller = analysis.controller;
    roomMemory.sources = analysis.sources;
    roomMemory.minerals = analysis.minerals;
    roomMemory.economy = analysis.economy;
    roomMemory.military = analysis.military;
    roomMemory.lastAnalysis = Game.time;
  }
}