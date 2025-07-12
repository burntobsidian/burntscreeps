import { MemoryManager } from "../core/MemoryManager";
import { Constants } from "../core/Constants";

export interface CreepRole {
  run(creep: Creep): void;
  shouldRecycle(creep: Creep): boolean;
  getNextState(creep: Creep): string;
}

export class CreepManager {
  private static roles: Map<string, CreepRole> = new Map();

  static registerRole(roleName: string, role: CreepRole): void {
    this.roles.set(roleName, role);
  }

  static runAll(): void {
    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      this.runCreep(creep);
    }
  }

  static runCreep(creep: Creep): void {
    if (!creep.memory.initialized) {
      MemoryManager.initializeCreepMemory(creep, creep.memory.role || 'harvester');
    }

    if (creep.spawning) {
      creep.memory.state = Constants.CREEP_STATES.SPAWNING;
      return;
    }

    const role = this.roles.get(creep.memory.role);
    if (!role) {
      console.log(`Unknown role: ${creep.memory.role} for creep ${creep.name}`);
      return;
    }

    if (role.shouldRecycle(creep)) {
      this.recycleCreep(creep);
      return;
    }

    const newState = role.getNextState(creep);
    if (newState !== creep.memory.state) {
      creep.memory.state = newState;
    }

    try {
      role.run(creep);
    } catch (error) {
      console.log(`Error running creep ${creep.name}: ${error}`);
    }
  }

  private static recycleCreep(creep: Creep): void {
    const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
    if (spawn) {
      if (creep.pos.isNearTo(spawn)) {
        spawn.recycleCreep(creep);
      } else {
        creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ffaa00' } });
      }
    }
  }
}

export abstract class BaseRole implements CreepRole {
  abstract run(creep: Creep): void;

  shouldRecycle(creep: Creep): boolean {
    return creep.ticksToLive !== undefined && creep.ticksToLive < 50;
  }

  getNextState(creep: Creep): string {
    return creep.memory.state;
  }

  protected moveToTarget(creep: Creep, target: RoomObject, range: number = 1): number {
    const result = creep.moveTo(target, {
      visualizePathStyle: { stroke: this.getPathColor() },
      range
    });
    
    if (result === ERR_NO_PATH) {
      creep.memory.target = null;
    }
    
    return result;
  }

  protected findEnergySource(creep: Creep): Structure | Source | Resource | null {
    const room = creep.room;
    
    const droppedEnergy = room.find(FIND_DROPPED_RESOURCES, {
      filter: (resource) => resource.resourceType === RESOURCE_ENERGY && resource.amount > 50
    });
    
    if (droppedEnergy.length > 0) {
      return creep.pos.findClosestByPath(droppedEnergy);
    }

    const containers = room.find(FIND_STRUCTURES, {
      filter: (structure) => 
        structure.structureType === STRUCTURE_CONTAINER &&
        (structure as StructureContainer).store[RESOURCE_ENERGY] > 0
    }) as StructureContainer[];
    
    if (containers.length > 0) {
      return creep.pos.findClosestByPath(containers);
    }

    const storage = room.storage;
    if (storage && storage.store[RESOURCE_ENERGY] > 1000) {
      return storage;
    }

    const sources = room.find(FIND_SOURCES_ACTIVE);
    return creep.pos.findClosestByPath(sources);
  }

  protected findEnergyTarget(creep: Creep): Structure | null {
    const room = creep.room;
    
    const spawns = room.find(FIND_MY_SPAWNS, {
      filter: (spawn) => spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
    
    if (spawns.length > 0) {
      return creep.pos.findClosestByPath(spawns);
    }

    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => 
        structure.structureType === STRUCTURE_EXTENSION &&
        (structure as StructureExtension).store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
    
    if (extensions.length > 0) {
      return creep.pos.findClosestByPath(extensions);
    }

    const towers = room.find(FIND_MY_STRUCTURES, {
      filter: (structure) => 
        structure.structureType === STRUCTURE_TOWER &&
        (structure as StructureTower).store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });
    
    if (towers.length > 0) {
      return creep.pos.findClosestByPath(towers);
    }

    const storage = room.storage;
    if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      return storage;
    }

    return null;
  }

  protected abstract getPathColor(): string;
}

export class HarvesterRole extends BaseRole {
  run(creep: Creep): void {
    switch (creep.memory.state) {
      case Constants.CREEP_STATES.HARVESTING:
        this.harvest(creep);
        break;
      case Constants.CREEP_STATES.DELIVERING:
        this.deliver(creep);
        break;
      default:
        creep.memory.state = Constants.CREEP_STATES.HARVESTING;
    }
  }

  getNextState(creep: Creep): string {
    if (creep.store.getFreeCapacity() === 0 && creep.memory.state === Constants.CREEP_STATES.HARVESTING) {
      return Constants.CREEP_STATES.DELIVERING;
    }
    if (creep.store.getUsedCapacity() === 0 && creep.memory.state === Constants.CREEP_STATES.DELIVERING) {
      return Constants.CREEP_STATES.HARVESTING;
    }
    return creep.memory.state;
  }

  private harvest(creep: Creep): void {
    const source = this.findEnergySource(creep);
    if (source) {
      if (source instanceof Source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      } else if (source instanceof Resource) {
        if (creep.pickup(source) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      } else {
        if (creep.withdraw(source as any, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      }
    }
  }

  private deliver(creep: Creep): void {
    const target = this.findEnergyTarget(creep);
    if (target) {
      if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        this.moveToTarget(creep, target);
      }
    }
  }

  protected getPathColor(): string {
    return '#ffffff';
  }
}

export class UpgraderRole extends BaseRole {
  run(creep: Creep): void {
    switch (creep.memory.state) {
      case Constants.CREEP_STATES.HARVESTING:
        this.harvest(creep);
        break;
      case Constants.CREEP_STATES.UPGRADING:
        this.upgrade(creep);
        break;
      default:
        creep.memory.state = Constants.CREEP_STATES.HARVESTING;
    }
  }

  getNextState(creep: Creep): string {
    if (creep.store.getFreeCapacity() === 0 && creep.memory.state === Constants.CREEP_STATES.HARVESTING) {
      return Constants.CREEP_STATES.UPGRADING;
    }
    if (creep.store.getUsedCapacity() === 0 && creep.memory.state === Constants.CREEP_STATES.UPGRADING) {
      return Constants.CREEP_STATES.HARVESTING;
    }
    return creep.memory.state;
  }

  private harvest(creep: Creep): void {
    const source = this.findEnergySource(creep);
    if (source) {
      if (source instanceof Source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      } else if (source instanceof Resource) {
        if (creep.pickup(source) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      } else {
        if (creep.withdraw(source as any, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      }
    }
  }

  private upgrade(creep: Creep): void {
    if (creep.room.controller) {
      if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
        this.moveToTarget(creep, creep.room.controller, 3);
      }
    }
  }

  protected getPathColor(): string {
    return '#00ff00';
  }
}

export class BuilderRole extends BaseRole {
  run(creep: Creep): void {
    switch (creep.memory.state) {
      case Constants.CREEP_STATES.HARVESTING:
        this.harvest(creep);
        break;
      case Constants.CREEP_STATES.BUILDING:
        this.build(creep);
        break;
      default:
        creep.memory.state = Constants.CREEP_STATES.HARVESTING;
    }
  }

  getNextState(creep: Creep): string {
    if (creep.store.getFreeCapacity() === 0 && creep.memory.state === Constants.CREEP_STATES.HARVESTING) {
      return Constants.CREEP_STATES.BUILDING;
    }
    if (creep.store.getUsedCapacity() === 0 && creep.memory.state === Constants.CREEP_STATES.BUILDING) {
      return Constants.CREEP_STATES.HARVESTING;
    }
    return creep.memory.state;
  }

  private harvest(creep: Creep): void {
    const source = this.findEnergySource(creep);
    if (source) {
      if (source instanceof Source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      } else if (source instanceof Resource) {
        if (creep.pickup(source) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      } else {
        if (creep.withdraw(source as any, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      }
    }
  }

  private build(creep: Creep): void {
    const targets = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (targets.length > 0) {
      const target = creep.pos.findClosestByPath(targets);
      if (target) {
        if (creep.build(target) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, target, 3);
        }
      }
    } else {
      this.upgrade(creep);
    }
  }

  private upgrade(creep: Creep): void {
    if (creep.room.controller) {
      if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
        this.moveToTarget(creep, creep.room.controller, 3);
      }
    }
  }

  protected getPathColor(): string {
    return '#0066ff';
  }
}

export class MinerRole extends BaseRole {
  run(creep: Creep): void {
    switch (creep.memory.state) {
      case Constants.CREEP_STATES.MOVING:
        this.moveToSource(creep);
        break;
      case Constants.CREEP_STATES.MINING:
        this.mine(creep);
        break;
      default:
        creep.memory.state = Constants.CREEP_STATES.MOVING;
    }
  }

  getNextState(creep: Creep): string {
    const target = this.getAssignedSource(creep);
    if (target && creep.pos.isNearTo(target)) {
      return Constants.CREEP_STATES.MINING;
    }
    return Constants.CREEP_STATES.MOVING;
  }

  private moveToSource(creep: Creep): void {
    const source = this.getAssignedSource(creep);
    if (source) {
      this.moveToTarget(creep, source, 1);
    }
  }

  private mine(creep: Creep): void {
    const source = this.getAssignedSource(creep);
    if (source) {
      const result = creep.harvest(source);
      
      if (creep.store.getFreeCapacity() === 0) {
        this.dropEnergy(creep);
      }
      
      if (result === ERR_NOT_IN_RANGE) {
        creep.memory.state = Constants.CREEP_STATES.MOVING;
      }
    }
  }

  private dropEnergy(creep: Creep): void {
    const container = creep.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: { structureType: STRUCTURE_CONTAINER }
    })[0] as StructureContainer;

    if (container && container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      creep.transfer(container, RESOURCE_ENERGY);
    } else {
      creep.drop(RESOURCE_ENERGY);
    }
  }

  private getAssignedSource(creep: Creep): Source | null {
    if (!creep.memory.target) {
      this.assignSource(creep);
    }
    
    return Game.getObjectById(creep.memory.target as Id<Source>);
  }

  private assignSource(creep: Creep): void {
    const sources = creep.room.find(FIND_SOURCES);
    const assignedSources = new Set();
    
    const otherMiners = creep.room.find(FIND_MY_CREEPS, {
      filter: (c) => c.memory.role === Constants.CREEP_ROLES.MINER && c.id !== creep.id
    });
    
    otherMiners.forEach(miner => {
      if (miner.memory.target) {
        assignedSources.add(miner.memory.target);
      }
    });
    
    const unassignedSource = sources.find(source => !assignedSources.has(source.id));
    if (unassignedSource) {
      creep.memory.target = unassignedSource.id;
    }
  }

  protected getPathColor(): string {
    return '#ffaa00';
  }
}

export class HaulerRole extends BaseRole {
  run(creep: Creep): void {
    switch (creep.memory.state) {
      case Constants.CREEP_STATES.HARVESTING:
        this.collectEnergy(creep);
        break;
      case Constants.CREEP_STATES.DELIVERING:
        this.deliverEnergy(creep);
        break;
      default:
        creep.memory.state = Constants.CREEP_STATES.HARVESTING;
    }
  }

  getNextState(creep: Creep): string {
    if (creep.store.getFreeCapacity() === 0 && creep.memory.state === Constants.CREEP_STATES.HARVESTING) {
      return Constants.CREEP_STATES.DELIVERING;
    }
    if (creep.store.getUsedCapacity() === 0 && creep.memory.state === Constants.CREEP_STATES.DELIVERING) {
      return Constants.CREEP_STATES.HARVESTING;
    }
    return creep.memory.state;
  }

  private collectEnergy(creep: Creep): void {
    const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
      filter: (resource) => resource.resourceType === RESOURCE_ENERGY && resource.amount > 50
    });

    if (droppedEnergy) {
      if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
        this.moveToTarget(creep, droppedEnergy);
      }
      return;
    }

    const containers = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => 
        structure.structureType === STRUCTURE_CONTAINER &&
        (structure as StructureContainer).store[RESOURCE_ENERGY] > 0
    }) as StructureContainer[];

    if (containers.length > 0) {
      const container = creep.pos.findClosestByPath(containers);
      if (container) {
        if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, container);
        }
      }
      return;
    }

    const source = this.findEnergySource(creep);
    if (source) {
      if (source instanceof Source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          this.moveToTarget(creep, source);
        }
      }
    }
  }

  private deliverEnergy(creep: Creep): void {
    const target = this.findEnergyTarget(creep);
    if (target) {
      if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        this.moveToTarget(creep, target);
      }
    }
  }

  protected getPathColor(): string {
    return '#ff6600';
  }
}