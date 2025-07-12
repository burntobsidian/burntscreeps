import { MemoryManager } from "../core/MemoryManager";
import { Constants } from "../core/Constants";

export interface ConstructionPlan {
  structureType: BuildableStructureConstant;
  pos: RoomPosition;
  priority: number;
  rcl: number;
}

export class ConstructionManager {
  static run(room: Room): void {
    if (!room.controller?.my) return;

    const roomMemory = MemoryManager.getRoomMemory(room.name);
    const rcl = room.controller.level;

    this.updateConstructionPlans(room, rcl);
    this.buildPriorityStructures(room);
    this.maintainStructures(room);
  }

  private static updateConstructionPlans(room: Room, rcl: number): void {
    const roomMemory = MemoryManager.getRoomMemory(room.name);
    
    if (!roomMemory.construction.lastPlanUpdate || 
        roomMemory.construction.lastPlanUpdate < Game.time - 100 ||
        roomMemory.construction.lastRCL !== rcl) {
      
      this.generateConstructionPlan(room, rcl);
      roomMemory.construction.lastPlanUpdate = Game.time;
      roomMemory.construction.lastRCL = rcl;
    }
  }

  private static generateConstructionPlan(room: Room, rcl: number): void {
    const roomMemory = MemoryManager.getRoomMemory(room.name);
    const plans: ConstructionPlan[] = [];

    plans.push(...this.planExtensions(room, rcl));
    plans.push(...this.planContainers(room));
    plans.push(...this.planRoads(room));
    
    if (rcl >= 3) plans.push(...this.planTowers(room, rcl));
    if (rcl >= 4) plans.push(...this.planStorage(room));
    if (rcl >= 5) plans.push(...this.planLinks(room));
    if (rcl >= 6) plans.push(...this.planTerminal(room));
    if (rcl >= 6) plans.push(...this.planLabs(room, rcl));

    roomMemory.construction.plans = plans.sort((a, b) => b.priority - a.priority);
  }

  private static planExtensions(room: Room, rcl: number): ConstructionPlan[] {
    const maxExtensions = this.getMaxStructures(STRUCTURE_EXTENSION, rcl);
    const existingExtensions = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_EXTENSION }
    }).length;

    const needed = maxExtensions - existingExtensions;
    if (needed <= 0) return [];

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return [];

    const plans: ConstructionPlan[] = [];
    const positions = this.findExtensionPositions(room, spawn.pos, needed);

    positions.forEach(pos => {
      plans.push({
        structureType: STRUCTURE_EXTENSION,
        pos,
        priority: Constants.PRIORITIES.HIGH,
        rcl: 2
      });
    });

    return plans;
  }

  private static planContainers(room: Room): ConstructionPlan[] {
    const plans: ConstructionPlan[] = [];
    const sources = room.find(FIND_SOURCES);

    sources.forEach(source => {
      const existingContainer = source.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: { structureType: STRUCTURE_CONTAINER }
      })[0];

      if (!existingContainer) {
        const position = this.findOptimalContainerPosition(source);
        if (position) {
          plans.push({
            structureType: STRUCTURE_CONTAINER,
            pos: position,
            priority: Constants.PRIORITIES.NORMAL,
            rcl: 1
          });
        }
      }
    });

    const controller = room.controller;
    if (controller) {
      const existingContainer = controller.pos.findInRange(FIND_STRUCTURES, 3, {
        filter: { structureType: STRUCTURE_CONTAINER }
      })[0];

      if (!existingContainer) {
        const position = this.findOptimalContainerPosition(controller);
        if (position) {
          plans.push({
            structureType: STRUCTURE_CONTAINER,
            pos: position,
            priority: Constants.PRIORITIES.NORMAL,
            rcl: 1
          });
        }
      }
    }

    return plans;
  }

  private static planRoads(room: Room): ConstructionPlan[] {
    const plans: ConstructionPlan[] = [];
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return [];

    const sources = room.find(FIND_SOURCES);
    const controller = room.controller;

    sources.forEach(source => {
      const path = spawn.pos.findPathTo(source.pos);
      path.forEach(step => {
        const pos = new RoomPosition(step.x, step.y, room.name);
        const existingStructure = pos.lookFor(LOOK_STRUCTURES)[0];
        const terrain = pos.lookFor(LOOK_TERRAIN)[0];
        
        if (!existingStructure && terrain !== 'wall') {
          plans.push({
            structureType: STRUCTURE_ROAD,
            pos,
            priority: Constants.PRIORITIES.LOW,
            rcl: 1
          });
        }
      });
    });

    if (controller) {
      const path = spawn.pos.findPathTo(controller.pos);
      path.forEach(step => {
        const pos = new RoomPosition(step.x, step.y, room.name);
        const existingStructure = pos.lookFor(LOOK_STRUCTURES)[0];
        const terrain = pos.lookFor(LOOK_TERRAIN)[0];
        
        if (!existingStructure && terrain !== 'wall') {
          plans.push({
            structureType: STRUCTURE_ROAD,
            pos,
            priority: Constants.PRIORITIES.LOW,
            rcl: 1
          });
        }
      });
    }

    return plans;
  }

  private static planTowers(room: Room, rcl: number): ConstructionPlan[] {
    const maxTowers = this.getMaxStructures(STRUCTURE_TOWER, rcl);
    const existingTowers = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_TOWER }
    }).length;

    const needed = maxTowers - existingTowers;
    if (needed <= 0) return [];

    const plans: ConstructionPlan[] = [];
    const positions = this.findTowerPositions(room, needed);

    positions.forEach(pos => {
      plans.push({
        structureType: STRUCTURE_TOWER,
        pos,
        priority: Constants.PRIORITIES.CRITICAL,
        rcl: 3
      });
    });

    return plans;
  }

  private static planStorage(room: Room): ConstructionPlan[] {
    const existingStorage = room.storage;
    if (existingStorage) return [];

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return [];

    const position = this.findStoragePosition(room, spawn.pos);
    if (!position) return [];

    return [{
      structureType: STRUCTURE_STORAGE,
      pos: position,
      priority: Constants.PRIORITIES.CRITICAL,
      rcl: 4
    }];
  }

  private static planLinks(room: Room): ConstructionPlan[] {
    const maxLinks = this.getMaxStructures(STRUCTURE_LINK, room.controller?.level || 0);
    const existingLinks = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_LINK }
    }).length;

    const needed = maxLinks - existingLinks;
    if (needed <= 0) return [];

    const plans: ConstructionPlan[] = [];
    
    return plans;
  }

  private static planTerminal(room: Room): ConstructionPlan[] {
    const existingTerminal = room.terminal;
    if (existingTerminal) return [];

    const storage = room.storage;
    if (!storage) return [];

    const position = this.findTerminalPosition(room, storage.pos);
    if (!position) return [];

    return [{
      structureType: STRUCTURE_TERMINAL,
      pos: position,
      priority: Constants.PRIORITIES.HIGH,
      rcl: 6
    }];
  }

  private static planLabs(room: Room, rcl: number): ConstructionPlan[] {
    const maxLabs = this.getMaxStructures(STRUCTURE_LAB, rcl);
    const existingLabs = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_LAB }
    }).length;

    const needed = maxLabs - existingLabs;
    if (needed <= 0) return [];

    const plans: ConstructionPlan[] = [];
    
    return plans;
  }

  private static buildPriorityStructures(room: Room): void {
    const roomMemory = MemoryManager.getRoomMemory(room.name);
    const plans = roomMemory.construction.plans || [];
    const constructionSites = room.find(FIND_CONSTRUCTION_SITES);

    if (constructionSites.length >= 5) return;

    const rcl = room.controller?.level || 0;
    const priorityPlans = plans.filter((plan: ConstructionPlan) => 
      plan.rcl <= rcl && 
      plan.priority >= Constants.PRIORITIES.NORMAL &&
      !constructionSites.some(site => site.pos.isEqualTo(plan.pos))
    );

    const toBuild = priorityPlans.slice(0, 5 - constructionSites.length);
    toBuild.forEach((plan: ConstructionPlan) => {
      const result = room.createConstructionSite(plan.pos, plan.structureType);
      if (result === OK) {
        console.log(`Created construction site for ${plan.structureType} at ${plan.pos}`);
      }
    });
  }

  private static maintainStructures(room: Room): void {
    const towers = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_TOWER }
    }) as StructureTower[];

    towers.forEach(tower => {
      if (tower.store[RESOURCE_ENERGY] < tower.store.getCapacity(RESOURCE_ENERGY) * 0.1) {
        return;
      }

      const damagedStructures = room.find(FIND_STRUCTURES, {
        filter: (structure) => 
          structure.hits < structure.hitsMax && 
          structure.structureType !== STRUCTURE_WALL &&
          structure.structureType !== STRUCTURE_RAMPART
      });

      if (damagedStructures.length > 0) {
        const target = tower.pos.findClosestByRange(damagedStructures);
        if (target) {
          tower.repair(target);
        }
      }
    });
  }

  private static findExtensionPositions(room: Room, centerPos: RoomPosition, count: number): RoomPosition[] {
    const positions: RoomPosition[] = [];
    const terrain = new Room.Terrain(room.name);

    for (let radius = 2; radius <= 10 && positions.length < count; radius++) {
      for (let dx = -radius; dx <= radius && positions.length < count; dx++) {
        for (let dy = -radius; dy <= radius && positions.length < count; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

          const x = centerPos.x + dx;
          const y = centerPos.y + dy;

          if (x < 2 || x > 47 || y < 2 || y > 47) continue;
          if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

          const pos = new RoomPosition(x, y, room.name);
          const structures = pos.lookFor(LOOK_STRUCTURES);
          const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

          if (structures.length === 0 && sites.length === 0) {
            positions.push(pos);
          }
        }
      }
    }

    return positions;
  }

  private static findOptimalContainerPosition(target: Source | StructureController): RoomPosition | null {
    const terrain = new Room.Terrain(target.room!.name);
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const x = target.pos.x + dx;
        const y = target.pos.y + dy;

        if (x < 1 || x > 48 || y < 1 || y > 48) continue;
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

        const pos = new RoomPosition(x, y, target.room!.name);
        const structures = pos.lookFor(LOOK_STRUCTURES);
        
        if (structures.length === 0) {
          return pos;
        }
      }
    }

    return null;
  }

  private static findTowerPositions(room: Room, count: number): RoomPosition[] {
    const positions: RoomPosition[] = [];
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return positions;

    const terrain = new Room.Terrain(room.name);

    for (let radius = 3; radius <= 8 && positions.length < count; radius++) {
      for (let dx = -radius; dx <= radius && positions.length < count; dx++) {
        for (let dy = -radius; dy <= radius && positions.length < count; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

          const x = spawn.pos.x + dx;
          const y = spawn.pos.y + dy;

          if (x < 2 || x > 47 || y < 2 || y > 47) continue;
          if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

          const pos = new RoomPosition(x, y, room.name);
          const structures = pos.lookFor(LOOK_STRUCTURES);
          const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

          if (structures.length === 0 && sites.length === 0) {
            positions.push(pos);
          }
        }
      }
    }

    return positions;
  }

  private static findStoragePosition(room: Room, centerPos: RoomPosition): RoomPosition | null {
    const terrain = new Room.Terrain(room.name);

    for (let radius = 2; radius <= 5; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

          const x = centerPos.x + dx;
          const y = centerPos.y + dy;

          if (x < 2 || x > 47 || y < 2 || y > 47) continue;
          if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

          const pos = new RoomPosition(x, y, room.name);
          const structures = pos.lookFor(LOOK_STRUCTURES);
          const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

          if (structures.length === 0 && sites.length === 0) {
            return pos;
          }
        }
      }
    }

    return null;
  }

  private static findTerminalPosition(room: Room, storagePos: RoomPosition): RoomPosition | null {
    const terrain = new Room.Terrain(room.name);

    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue;

        const x = storagePos.x + dx;
        const y = storagePos.y + dy;

        if (x < 2 || x > 47 || y < 2 || y > 47) continue;
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

        const pos = new RoomPosition(x, y, room.name);
        const structures = pos.lookFor(LOOK_STRUCTURES);
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

        if (structures.length === 0 && sites.length === 0) {
          return pos;
        }
      }
    }

    return null;
  }

  private static getMaxStructures(structureType: BuildableStructureConstant, rcl: number): number {
    const limits: { [key: string]: number[] } = {
      [STRUCTURE_EXTENSION]: [0, 0, 5, 10, 20, 30, 40, 50, 60],
      [STRUCTURE_TOWER]: [0, 0, 0, 1, 1, 2, 2, 3, 6],
      [STRUCTURE_STORAGE]: [0, 0, 0, 0, 1, 1, 1, 1, 1],
      [STRUCTURE_LINK]: [0, 0, 0, 0, 0, 2, 3, 4, 6],
      [STRUCTURE_TERMINAL]: [0, 0, 0, 0, 0, 0, 1, 1, 1],
      [STRUCTURE_LAB]: [0, 0, 0, 0, 0, 0, 3, 6, 10],
      [STRUCTURE_FACTORY]: [0, 0, 0, 0, 0, 0, 0, 1, 1]
    };

    return limits[structureType]?.[rcl] || 0;
  }
}