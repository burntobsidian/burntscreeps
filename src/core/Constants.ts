export class Constants {
  static readonly CREEP_ROLES = {
    HARVESTER: 'harvester',
    UPGRADER: 'upgrader',
    BUILDER: 'builder',
    MINER: 'miner',
    HAULER: 'hauler',
    REMOTE_MINER: 'remoteMiner',
    REMOTE_HAULER: 'remoteHauler',
    SCOUT: 'scout',
    DEFENDER: 'defender',
    ATTACKER: 'attacker',
    HEALER: 'healer',
    CLAIMER: 'claimer',
    RESERVER: 'reserver'
  } as const;

  static readonly CREEP_STATES = {
    SPAWNING: 'spawning',
    HARVESTING: 'harvesting',
    DELIVERING: 'delivering',
    UPGRADING: 'upgrading',
    BUILDING: 'building',
    MINING: 'mining',
    HAULING: 'hauling',
    MOVING: 'moving',
    WAITING: 'waiting',
    ATTACKING: 'attacking',
    HEALING: 'healing',
    CLAIMING: 'claiming',
    RESERVING: 'reserving',
    SCOUTING: 'scouting'
  } as const;

  static readonly BODY_PARTS = {
    MINIMAL_WORKER: [WORK, CARRY, MOVE],
    FAST_WORKER: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
    HEAVY_WORKER: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    MINER_SMALL: [WORK, WORK, WORK, WORK, WORK, MOVE],
    MINER_LARGE: [WORK, WORK, WORK, WORK, WORK, WORK, MOVE],
    HAULER_SMALL: [CARRY, CARRY, MOVE],
    HAULER_LARGE: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    SCOUT: [MOVE],
    CLAIMER: [CLAIM, MOVE],
    RESERVER: [CLAIM, CLAIM, MOVE]
  } as const;

  static readonly PRIORITIES = {
    CRITICAL: 5,
    HIGH: 4,
    NORMAL: 3,
    LOW: 2,
    MINIMAL: 1
  } as const;

  static readonly ROOM_TYPES = {
    OWNED: 'owned',
    REMOTE: 'remote',
    RESERVED: 'reserved',
    NEUTRAL: 'neutral',
    HOSTILE: 'hostile',
    SOURCE_KEEPER: 'sourceKeeper',
    HIGHWAY: 'highway'
  } as const;

  static readonly RESOURCE_PRIORITIES = {
    ENERGY: 10,
    HYDROGEN: 8,
    OXYGEN: 8,
    UTRIUM: 7,
    LEMERGIUM: 7,
    KEANIUM: 7,
    ZYNTHIUM: 7,
    CATALYST: 6,
    GHODIUM: 9
  } as const;

  static readonly CPU_LIMITS = {
    ROOM_ANALYSIS: 5,
    CREEP_MANAGEMENT: 10,
    CONSTRUCTION: 3,
    MARKET: 2,
    DEFENSE: 8
  } as const;

  static readonly CACHE_TTL = {
    ROOM_INTEL: 500,
    PATH_CACHE: 1000,
    MARKET_DATA: 100,
    THREAT_ASSESSMENT: 200
  } as const;

  static readonly ECONOMIC_THRESHOLDS = {
    ENERGY_CRITICAL: 100,
    ENERGY_LOW: 500,
    ENERGY_STABLE: 1000,
    ENERGY_SURPLUS: 5000,
    REMOTE_MINING_MIN_ENERGY: 1500
  } as const;

  static readonly MILITARY_CONFIG = {
    TOWER_REPAIR_THRESHOLD: 0.7,
    RAMPART_MIN_HITS: 10000,
    RAMPART_MAX_HITS: 100000,
    THREAT_RESPONSE_DISTANCE: 3,
    PATROL_INTERVAL: 100
  } as const;
}