export class MemoryManager {
  static cleanup(): void {
    this.cleanupCreepMemory();
    this.cleanupRoomMemory();
    this.initializeEmpireMemory();
    this.cleanupExpiredCache();
  }

  private static cleanupCreepMemory(): void {
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }
  }

  private static cleanupRoomMemory(): void {
    if (!Memory.rooms) Memory.rooms = {};
    
    for (const roomName in Memory.rooms) {
      if (!(roomName in Game.rooms)) {
        const roomMemory = Memory.rooms[roomName];
        if (roomMemory.lastSeen && Game.time - roomMemory.lastSeen > 10000) {
          delete Memory.rooms[roomName];
        }
      }
    }
  }

  private static initializeEmpireMemory(): void {
    if (!Memory.empire) {
      Memory.empire = {
        totalEnergy: 0,
        totalCreeps: 0,
        gcl: Game.gcl.level,
        cpu: 0
      };
    }

    Memory.empire.totalCreeps = Object.keys(Game.creeps).length;
    Memory.empire.gcl = Game.gcl.level;
    
    let totalEnergy = 0;
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      if (room.controller?.my) {
        totalEnergy += room.energyAvailable;
        if (room.storage) totalEnergy += room.storage.store[RESOURCE_ENERGY] || 0;
        if (room.terminal) totalEnergy += room.terminal.store[RESOURCE_ENERGY] || 0;
      }
    }
    Memory.empire.totalEnergy = totalEnergy;
  }

  private static cleanupExpiredCache(): void {
    for (const roomName in Memory.rooms) {
      const roomMemory = Memory.rooms[roomName];
      
      if (roomMemory.cache) {
        for (const cacheKey in roomMemory.cache) {
          const cacheEntry = roomMemory.cache[cacheKey];
          if (cacheEntry.expires && Game.time > cacheEntry.expires) {
            delete roomMemory.cache[cacheKey];
          }
        }
      }
    }
  }

  static initializeRoomMemory(roomName: string): void {
    if (!Memory.rooms[roomName]) {
      Memory.rooms[roomName] = {
        initialized: true,
        lastSeen: Game.time,
        sources: {},
        minerals: {},
        threats: [],
        economy: {
          energyCapacity: 0,
          energyAvailable: 0,
          remoteMining: []
        },
        construction: {
          planned: {},
          priorities: []
        },
        military: {
          defenseLevel: 0,
          threats: [],
          lastAttack: 0
        },
        cache: {}
      };
    }
    
    Memory.rooms[roomName].lastSeen = Game.time;
  }

  static initializeCreepMemory(creep: Creep, role: string): void {
    if (!creep.memory.initialized) {
      creep.memory = {
        role,
        state: 'spawning',
        target: null,
        homeRoom: creep.room.name,
        workRoom: creep.room.name,
        initialized: true,
        born: Game.time,
        stats: {
          energyHarvested: 0,
          energySpent: 0,
          workDone: 0
        }
      };
    }
  }

  static getRoomMemory(roomName: string): any {
    if (!Memory.rooms[roomName]) {
      this.initializeRoomMemory(roomName);
    }
    return Memory.rooms[roomName];
  }

  static setCache(roomName: string, key: string, data: any, ttl: number): void {
    const roomMemory = this.getRoomMemory(roomName);
    if (!roomMemory.cache) roomMemory.cache = {};
    
    roomMemory.cache[key] = {
      data,
      expires: Game.time + ttl,
      created: Game.time
    };
  }

  static getCache(roomName: string, key: string): any {
    const roomMemory = this.getRoomMemory(roomName);
    if (!roomMemory.cache || !roomMemory.cache[key]) return null;
    
    const cacheEntry = roomMemory.cache[key];
    if (cacheEntry.expires && Game.time > cacheEntry.expires) {
      delete roomMemory.cache[key];
      return null;
    }
    
    return cacheEntry.data;
  }
}