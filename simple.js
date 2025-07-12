// Elite Screeps Foundation - Simple Deployment Version
module.exports.loop = function () {
    // Memory cleanup
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
        }
    }

    // Initialize empire memory
    if (!Memory.empire) {
        Memory.empire = { totalEnergy: 0, totalCreeps: 0, gcl: Game.gcl.level, cpu: 0 };
    }

    // Run all creeps
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        
        // Initialize creep memory
        if (!creep.memory.role) {
            creep.memory.role = 'harvester';
            creep.memory.state = 'harvesting';
        }

        // Skip spawning creeps
        if (creep.spawning) continue;

        // Run creep logic based on role
        if (creep.memory.role === 'harvester') {
            runHarvester(creep);
        } else if (creep.memory.role === 'upgrader') {
            runUpgrader(creep);
        } else if (creep.memory.role === 'builder') {
            runBuilder(creep);
        }
    }

    // Run rooms
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
            manageSpawning(room);
            manageTowers(room);
        }
    }

    // CPU logging
    const cpu = Game.cpu.getUsed();
    if (Game.time % 100 === 0) {
        console.log(`[${Game.time}] CPU: ${cpu.toFixed(2)}/${Game.cpu.limit} | GCL: ${Game.gcl.level}`);
    }
};

function runHarvester(creep) {
    if (creep.store.getFreeCapacity() > 0) {
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
    } else {
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_EXTENSION ||
                        structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        if (target) {
            if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
    }
}

function runUpgrader(creep) {
    if (creep.store.getUsedCapacity() === 0) {
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {stroke: '#00ff00'}});
            }
        }
    } else {
        if (creep.room.controller) {
            if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#00ff00'}});
            }
        }
    }
}

function runBuilder(creep) {
    if (creep.store.getUsedCapacity() === 0) {
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {stroke: '#0066ff'}});
            }
        }
    } else {
        const targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        if (targets.length > 0) {
            if (creep.build(targets[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#0066ff'}});
            }
        } else {
            // No construction sites, upgrade controller instead
            if (creep.room.controller) {
                if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#0066ff'}});
                }
            }
        }
    }
}

function manageSpawning(room) {
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) return;

    const creeps = room.find(FIND_MY_CREEPS);
    const harvesters = creeps.filter(creep => creep.memory.role === 'harvester');
    const upgraders = creeps.filter(creep => creep.memory.role === 'upgrader');
    const builders = creeps.filter(creep => creep.memory.role === 'builder');

    const spawn = spawns[0];
    if (spawn.spawning) return;

    const energy = room.energyCapacityAvailable;
    let body = [WORK, CARRY, MOVE];
    
    if (energy >= 550) {
        body = [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
    }

    if (harvesters.length < 2) {
        const name = 'Harvester' + Game.time;
        spawn.spawnCreep(body, name, {memory: {role: 'harvester'}});
        console.log('Spawning new harvester: ' + name);
    } else if (upgraders.length < 2) {
        const name = 'Upgrader' + Game.time;
        spawn.spawnCreep(body, name, {memory: {role: 'upgrader'}});
        console.log('Spawning new upgrader: ' + name);
    } else {
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        if (constructionSites.length > 0 && builders.length < 2) {
            const name = 'Builder' + Game.time;
            spawn.spawnCreep(body, name, {memory: {role: 'builder'}});
            console.log('Spawning new builder: ' + name);
        }
    }
}

function manageTowers(room) {
    const towers = room.find(FIND_MY_STRUCTURES, {
        filter: {structureType: STRUCTURE_TOWER}
    });

    towers.forEach(tower => {
        const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile) {
            tower.attack(closestHostile);
        } else {
            const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL
            });
            if (closestDamagedStructure && tower.store[RESOURCE_ENERGY] > 500) {
                tower.repair(closestDamagedStructure);
            }
        }
    });
}