import { MemoryManager } from "./core/MemoryManager";
import { Constants } from "./core/Constants";
import { RoomIntelligence } from "./intelligence/RoomIntelligence";
import { CreepManager, HarvesterRole, UpgraderRole, BuilderRole, MinerRole, HaulerRole } from "./creeps/CreepManager";
import { SpawnManager } from "./spawning/SpawnManager";
import { ConstructionManager } from "./construction/ConstructionManager";

CreepManager.registerRole(Constants.CREEP_ROLES.HARVESTER, new HarvesterRole());
CreepManager.registerRole(Constants.CREEP_ROLES.UPGRADER, new UpgraderRole());
CreepManager.registerRole(Constants.CREEP_ROLES.BUILDER, new BuilderRole());
CreepManager.registerRole(Constants.CREEP_ROLES.MINER, new MinerRole());
CreepManager.registerRole(Constants.CREEP_ROLES.HAULER, new HaulerRole());

declare global {
  interface Memory {
    stats: any;
    empire: {
      totalEnergy: number;
      totalCreeps: number;
      gcl: number;
      cpu: number;
    };
  }

  interface RoomMemory {
    initialized?: boolean;
    lastSeen?: number;
    sources?: any;
    minerals?: any;
    threats?: any[];
    economy?: {
      energyCapacity: number;
      energyAvailable: number;
      remoteMining: any[];
    };
    construction?: {
      planned: any;
      priorities: any[];
      plans?: any[];
      lastPlanUpdate?: number;
      lastRCL?: number;
    };
    military?: {
      defenseLevel: number;
      threats: any[];
      lastAttack: number;
    };
    cache?: any;
    creepCounts?: { [role: string]: Creep[] };
    lastAnalysis?: number;
  }

  interface CreepMemory {
    role: string;
    state: string;
    target?: string | null;
    homeRoom?: string;
    workRoom?: string;
    initialized?: boolean;
    born?: number;
    stats?: {
      energyHarvested: number;
      energySpent: number;
      workDone: number;
    };
  }
}

export const loop = (): void => {
  const startCpu = Game.cpu.getUsed();

  try {
    MemoryManager.cleanup();
    
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      
      if (room.controller?.my) {
        RoomIntelligence.analyze(room);
        ConstructionManager.run(room);
        SpawnManager.run(room);
      }
    }

    CreepManager.runAll();
    
    const endCpu = Game.cpu.getUsed();
    
    if (!Memory.stats) Memory.stats = {};
    Memory.stats.cpu = endCpu;
    Memory.stats.gcl = Game.gcl.level;
    Memory.stats.gclProgress = Game.gcl.progress;
    Memory.stats.gclProgressTotal = Game.gcl.progressTotal;
    
    if (Game.time % 100 === 0) {
      console.log(`[${Game.time}] CPU: ${endCpu.toFixed(2)}/${Game.cpu.limit} | GCL: ${Game.gcl.level} | Rooms: ${Object.keys(Game.rooms).length}`);
    }
    
  } catch (error) {
    console.log(`Error in main loop: ${error}`);
  }
};