import { Constants } from "../core/Constants";
import { MemoryManager } from "../core/MemoryManager";

export interface SpawnRequest {
  role: string;
  priority: number;
  body: BodyPartConstant[];
  name?: string;
  memory?: any;
  room: string;
}

export class SpawnManager {
  private static spawnQueue: SpawnRequest[] = [];

  static run(room: Room): void {
    const spawns = room.find(FIND_MY_SPAWNS);
    
    if (spawns.length === 0) return;

    this.analyzeRoom(room);
    this.generateSpawnRequests(room);
    this.processSpawnQueue(room, spawns);
  }

  private static analyzeRoom(room: Room): void {
    const roomMemory = MemoryManager.getRoomMemory(room.name);
    
    const creepsByRole: { [role: string]: Creep[] } = {};
    const creepsInRoom = room.find(FIND_MY_CREEPS);
    
    creepsInRoom.forEach(creep => {
      const role = creep.memory.role;
      if (!creepsByRole[role]) creepsByRole[role] = [];
      creepsByRole[role].push(creep);
    });

    roomMemory.creepCounts = creepsByRole;
  }

  private static generateSpawnRequests(room: Room): void {
    const roomMemory = MemoryManager.getRoomMemory(room.name);
    const creepCounts = roomMemory.creepCounts || {};
    const rcl = room.controller?.level || 0;
    const energy = room.energyCapacityAvailable;

    if (!creepCounts[Constants.CREEP_ROLES.HARVESTER] || creepCounts[Constants.CREEP_ROLES.HARVESTER].length < 2) {
      this.requestSpawn({
        role: Constants.CREEP_ROLES.HARVESTER,
        priority: Constants.PRIORITIES.CRITICAL,
        body: this.getOptimalBody(Constants.CREEP_ROLES.HARVESTER, energy, rcl),
        room: room.name
      });
    }

    if (!creepCounts[Constants.CREEP_ROLES.UPGRADER] || creepCounts[Constants.CREEP_ROLES.UPGRADER].length < 1) {
      this.requestSpawn({
        role: Constants.CREEP_ROLES.UPGRADER,
        priority: Constants.PRIORITIES.HIGH,
        body: this.getOptimalBody(Constants.CREEP_ROLES.UPGRADER, energy, rcl),
        room: room.name
      });
    }

    const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
    if (constructionSites.length > 0) {
      const builderCount = creepCounts[Constants.CREEP_ROLES.BUILDER]?.length || 0;
      if (builderCount < Math.min(3, Math.ceil(constructionSites.length / 5))) {
        this.requestSpawn({
          role: Constants.CREEP_ROLES.BUILDER,
          priority: Constants.PRIORITIES.NORMAL,
          body: this.getOptimalBody(Constants.CREEP_ROLES.BUILDER, energy, rcl),
          room: room.name
        });
      }
    }

    if (rcl >= 2 && energy >= 550) {
      const sources = room.find(FIND_SOURCES);
      const minerCount = creepCounts[Constants.CREEP_ROLES.MINER]?.length || 0;
      
      if (minerCount < sources.length) {
        this.requestSpawn({
          role: Constants.CREEP_ROLES.MINER,
          priority: Constants.PRIORITIES.HIGH,
          body: this.getOptimalBody(Constants.CREEP_ROLES.MINER, energy, rcl),
          room: room.name
        });
      }

      const haulerCount = creepCounts[Constants.CREEP_ROLES.HAULER]?.length || 0;
      if (haulerCount < sources.length * 2) {
        this.requestSpawn({
          role: Constants.CREEP_ROLES.HAULER,
          priority: Constants.PRIORITIES.NORMAL,
          body: this.getOptimalBody(Constants.CREEP_ROLES.HAULER, energy, rcl),
          room: room.name
        });
      }
    }
  }

  private static processSpawnQueue(room: Room, spawns: StructureSpawn[]): void {
    const roomRequests = this.spawnQueue
      .filter(request => request.room === room.name)
      .sort((a, b) => b.priority - a.priority);

    for (const spawn of spawns) {
      if (spawn.spawning) continue;

      const request = roomRequests.shift();
      if (!request) break;

      const name = request.name || this.generateCreepName(request.role);
      const result = spawn.spawnCreep(request.body, name, {
        memory: {
          role: request.role,
          ...request.memory
        }
      });

      if (result === OK) {
        console.log(`Spawning ${request.role}: ${name} in room ${room.name}`);
      } else if (result === ERR_NOT_ENOUGH_ENERGY) {
        roomRequests.unshift(request);
        break;
      } else {
        console.log(`Failed to spawn ${request.role}: ${result}`);
      }
    }

    this.spawnQueue = this.spawnQueue.filter(request => request.room !== room.name);
    this.spawnQueue.push(...roomRequests);
  }

  static requestSpawn(request: SpawnRequest): void {
    const existingRequest = this.spawnQueue.find(req => 
      req.role === request.role && req.room === request.room
    );
    
    if (!existingRequest) {
      this.spawnQueue.push(request);
    }
  }

  private static getOptimalBody(role: string, energy: number, rcl: number): BodyPartConstant[] {
    switch (role) {
      case Constants.CREEP_ROLES.HARVESTER:
        if (energy >= 550) return [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
        if (energy >= 300) return [WORK, CARRY, MOVE];
        return [WORK, CARRY, MOVE];

      case Constants.CREEP_ROLES.UPGRADER:
        if (energy >= 800) return [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
        if (energy >= 550) return [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
        if (energy >= 300) return [WORK, CARRY, MOVE];
        return [WORK, CARRY, MOVE];

      case Constants.CREEP_ROLES.BUILDER:
        if (energy >= 800) return [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
        if (energy >= 550) return [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
        if (energy >= 300) return [WORK, CARRY, MOVE];
        return [WORK, CARRY, MOVE];

      case Constants.CREEP_ROLES.MINER:
        if (energy >= 550) return [WORK, WORK, WORK, WORK, WORK, MOVE];
        if (energy >= 450) return [WORK, WORK, WORK, WORK, MOVE];
        return [WORK, WORK, WORK, MOVE];

      case Constants.CREEP_ROLES.HAULER:
        if (energy >= 600) return [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
        if (energy >= 300) return [CARRY, CARRY, CARRY, MOVE, MOVE];
        return [CARRY, CARRY, MOVE];

      default:
        return [WORK, CARRY, MOVE];
    }
  }

  private static generateCreepName(role: string): string {
    const timestamp = Game.time.toString(36);
    const random = Math.random().toString(36).substr(2, 3);
    return `${role}_${timestamp}_${random}`;
  }

  static getQueueStatus(): { [room: string]: SpawnRequest[] } {
    const status: { [room: string]: SpawnRequest[] } = {};
    
    this.spawnQueue.forEach(request => {
      if (!status[request.room]) status[request.room] = [];
      status[request.room].push(request);
    });
    
    return status;
  }
}