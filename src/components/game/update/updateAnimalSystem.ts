import { soundEngine } from '../../../utils/SoundEngine';
import { GRAVITY, JUMP_FORCE, REACH, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { getMaxStack } from '../crafting';
import type { GameState } from '../runtime';
import {
  isDecorationBlock,
  isTransparentBlock,
  isTreeBlock,
} from '../runtime';
import { AnimalType, BlockType } from '../types';
import type { Animal } from '../types';
import type { CollisionChecker, Intersector } from './updateContext';
import { getSurfaceY, getValidSpawnX } from '../world';
import { SpatialHash } from '../spatialHash';
import { ANIMAL_DEFS } from '../animalDefinitions';

// Module-level spatial hash, rebuilt each frame in updateAnimals
const animalGrid = new SpatialHash<Animal>();

export const updateDroppedItems = ({
  state,
  isIntersecting,
}: {
  state: GameState;
  isIntersecting: Intersector;
}) => {
  const { player } = state;
  const activeMinX = state.camera.x - state.camera.width;
  const activeMaxX = state.camera.x + state.camera.width * 2;
  const activeMinY = state.camera.y - state.camera.height;
  const activeMaxY = state.camera.y + state.camera.height * 2;
// Dropped items logic
for (let i = state.droppedItems.length - 1; i >= 0; i--) {
  const item = state.droppedItems[i];

  if (
    item.x + 16 < activeMinX ||
    item.x > activeMaxX ||
    item.y + 16 < activeMinY ||
    item.y > activeMaxY
  ) {
    continue;
  }
  
  // Magnet effect
  if (item.type !== BlockType.WORM) {
    const dx = (player.x + player.width / 2) - (item.x + 8);
    const dy = (player.y + player.height / 2) - (item.y + 8);
    const distSq = dx * dx + dy * dy;
    const magnetRangeSq = (REACH * 1.5) * (REACH * 1.5);

    if (distSq < magnetRangeSq) {
      const dist = Math.sqrt(distSq); // sqrt only when inside magnet range
      item.vx += (dx / dist) * 0.8;
      item.vy += (dy / dist) * 0.8;
      item.vx *= 0.9;
      item.vy *= 0.9;
    } else {
      item.vy += GRAVITY;
    }
  } else {
    // Worms wiggle around randomly
    item.vy += GRAVITY;
    if (Math.random() < 0.05 && item.vy === GRAVITY) { // Jump randomly
      item.vy = -2;
      item.vx = (Math.random() - 0.5) * 2;
    }

    // Check if in sun (throttled: only every 30 frames per item)
    if (state.tick % 30 === (i % 30)) {
      const isDay = state.timeOfDay > 1800 && state.timeOfDay < 5400;
      let inSun = false;
      if (isDay) {
        const cx = Math.floor((item.x + 8) / TILE_SIZE);
        const cy = Math.floor((item.y + 8) / TILE_SIZE);
        if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT) {
          inSun = true;
          for (let y = cy - 1; y >= 0; y--) {
            if (state.world[cx] && !isTransparentBlock(state.world[cx][y])) {
              inSun = false;
              break;
            }
          }
        }
      }
      if (inSun) {
        item.sunExposureTimer = (item.sunExposureTimer || 0) + 30; // +30 because we check every 30 frames
        if (item.sunExposureTimer > 600) {
          state.droppedItems.splice(i, 1);
          continue;
        }
      } else {
        item.sunExposureTimer = Math.max(0, (item.sunExposureTimer || 0) - 30);
      }
    }
  }

  item.x += item.vx;
  
  let cx = Math.floor((item.x + 8) / TILE_SIZE);
  let cy = Math.floor((item.y + 8) / TILE_SIZE);
  if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT && !isTransparentBlock(state.world[cx][cy])) {
    item.vx *= -0.5;
    item.x += item.vx;
  }
  
  item.y += item.vy;
  cx = Math.floor((item.x + 8) / TILE_SIZE);
  cy = Math.floor((item.y + 16) / TILE_SIZE);
  if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT && !isTransparentBlock(state.world[cx][cy])) {
    item.y = cy * TILE_SIZE - 16;
    if (item.vy > 0) item.vy = 0;
    item.vx *= 0.8;
  }

  const touchingPlayer = isIntersecting(player, { x: item.x, y: item.y, width: 16, height: 16 });
  if (touchingPlayer) {
    if (item.type === BlockType.WORM) {
      item.pickupTimer = (item.pickupTimer || 0) + 1;
      if (item.pickupTimer < 180) { // 3 seconds at 60fps
        continue; // Don't pick up yet
      }
    }
    
    const maxStack = getMaxStack(item.type);
    const currentCount = player.inventory[item.type] || 0;
    if (currentCount < maxStack) {
      player.inventory[item.type] = currentCount + 1;
      state.discoveredItems[item.type] = true;
      state.droppedItems.splice(i, 1);
      state.invChanged = true;
      soundEngine.pickup();
    } else {
      if (item.type === BlockType.WORM) {
        item.pickupTimer = 0; // Reset if player steps off
      }
    }
  } else if (item.type === BlockType.WORM) {
    item.pickupTimer = 0;
  }
}
};

export const spawnAnimals = (state: GameState) => {
  const { player } = state;
// Animal spawning logic
if (state.tick % 60 === 0) { // Check every second
  const counts = {
    [AnimalType.PIG]: 0,
    [AnimalType.COW]: 0,
    [AnimalType.CHICKEN]: 0,
    [AnimalType.SNAKE]: 0,
    [AnimalType.STRIPED_SNAKE]: 0,
    [AnimalType.TIGER_SNAKE]: 0,
    [AnimalType.ANT]: 0,
    [AnimalType.BIRD]: 0,
    [AnimalType.FISH]: 0,
    [AnimalType.ORCA]: 0,
    [AnimalType.DOLPHIN]: 0,
    [AnimalType.SHARK]: 0,
    [AnimalType.LEOPARD]: 0,
    [AnimalType.JAGUAR]: 0,
    [AnimalType.BLACK_JAGUAR]: 0,
    [AnimalType.COCOA_CAT]: 0
  };
  for (const a of state.animals) {
    if (counts[a.type] !== undefined) {
      counts[a.type]++;
    }
  }

  // Use ANIMAL_DEFS as the single source of truth for spawn limits
  const limits = Object.fromEntries(
    Object.entries(ANIMAL_DEFS).map(([k, v]) => [k, v.maxCount])
  ) as Record<AnimalType, number>;

  const typesToSpawn = [
    AnimalType.PIG, AnimalType.PIG, AnimalType.PIG,
    AnimalType.COW, AnimalType.COW, AnimalType.COW,
    AnimalType.CHICKEN, AnimalType.CHICKEN, AnimalType.CHICKEN,
    AnimalType.ANT, AnimalType.ANT, AnimalType.ANT,
    AnimalType.SNAKE, AnimalType.STRIPED_SNAKE, AnimalType.TIGER_SNAKE,
    AnimalType.BIRD, AnimalType.BIRD, AnimalType.BIRD,
    AnimalType.FISH, AnimalType.FISH, AnimalType.FISH,
    AnimalType.ORCA, AnimalType.DOLPHIN, AnimalType.SHARK,
    AnimalType.LEOPARD, AnimalType.LEOPARD, AnimalType.JAGUAR, AnimalType.JAGUAR, AnimalType.BLACK_JAGUAR, AnimalType.BLACK_JAGUAR
  ];
  const typeToSpawn = typesToSpawn[Math.floor(Math.random() * typesToSpawn.length)];
  
  if (counts[typeToSpawn] < limits[typeToSpawn]) {
    const spawnX = getValidSpawnX(typeToSpawn, state.world, player.x);
    
    if (spawnX !== null && Math.abs(spawnX * TILE_SIZE - player.x) > 400) {
      const surfaceY = getSurfaceY(spawnX);
      
      let canSpawn = true;
      const isWaterAnimal = typeToSpawn === AnimalType.FISH || typeToSpawn === AnimalType.ORCA || typeToSpawn === AnimalType.DOLPHIN || typeToSpawn === AnimalType.SHARK;
      if (!isWaterAnimal && typeToSpawn !== AnimalType.BIRD) {
        if (state.world[spawnX] && state.world[spawnX][surfaceY] === BlockType.WATER) {
          canSpawn = false; // Don't spawn non-fish in water
        }
      }
      
      if (canSpawn) {
        const spawnDef = ANIMAL_DEFS[typeToSpawn];
        const { width, height } = spawnDef;

        let spawnY = surfaceY - 2;
        if (typeToSpawn === AnimalType.BIRD) {
          spawnY = surfaceY - 10 - Math.floor(Math.random() * 10);
        } else if (isWaterAnimal) {
          let foundWater = false;
          for (let y = surfaceY; y < WORLD_HEIGHT; y++) {
            if (state.world[spawnX] && state.world[spawnX][y] === BlockType.WATER) {
              spawnY = y + 1;
              foundWater = true;
              break;
            }
          }
          if (!foundWater) canSpawn = false;
        } else if (typeToSpawn === AnimalType.SNAKE || typeToSpawn === AnimalType.STRIPED_SNAKE || typeToSpawn === AnimalType.TIGER_SNAKE) {
          for (let y = 0; y <= surfaceY; y++) {
            if (state.world[spawnX] && !isTransparentBlock(state.world[spawnX][y])) {
              spawnY = y - 1;
              break;
            }
          }
        }

        if (canSpawn) {
          const numToSpawn = (typeToSpawn === AnimalType.SNAKE || typeToSpawn === AnimalType.STRIPED_SNAKE || typeToSpawn === AnimalType.TIGER_SNAKE) ? Math.floor(Math.random() * 3) + 1 : 1;
          
          for (let j = 0; j < numToSpawn; j++) {
            state.animals.push({
              id: Math.random(),
              type: typeToSpawn,
              x: (spawnX + (Math.random() - 0.5) * 2) * TILE_SIZE,
              y: spawnY * TILE_SIZE,
              vx: 0,
              vy: 0,
              width,
              height,
              facing: Math.random() > 0.5 ? 1 : -1,
              state: 'idle',
              stateTime: Math.random() * 60,
              health: spawnDef.health,
              maxHealth: spawnDef.health,
              hurtTime: 0,
              attackCooldown: 0,
              launchCooldown: 0,
              aggro: false,
              poisonTimer: 0,
              poisonTick: 0,
              regenTimer: 0,
              tamed: false,
              attackTimer: 0,
              attackPattern: spawnDef.attackPattern,
              chargeTimer: 0,
            });
          }
        }
      }
    }
  }
}
};

export const updateAnimals = ({
  state,
  checkCollision,
  isIntersecting,
}: {
  state: GameState;
  checkCollision: CollisionChecker;
  isIntersecting: Intersector;
}) => {
  const { player } = state;
  const listenerX = player.x + player.width / 2;
  const listenerY = player.y + player.height / 2;
  const playAnimalSfx = (animal: Animal, priority: 'ambient' | 'normal' = 'ambient') => {
    soundEngine.animalSound(animal.type, {
      priority,
      source: {
        x: animal.x + animal.width / 2,
        y: animal.y + animal.height / 2,
      },
      listener: { x: listenerX, y: listenerY },
      maxDistance: priority === 'ambient' ? 900 : 1400,
    });
  };

  // Rebuild spatial hash each frame for O(1) neighbor lookups
  animalGrid.clear();
  for (const a of state.animals) animalGrid.insert(a);

  // Pre-filter food items once per frame so herbivores/ants don't scan all dropped items
  const foodItems = state.droppedItems.filter(
    item => item.type === BlockType.APPLE || item.type === BlockType.WORM
  );

// Animal logic
for (let i = state.animals.length - 1; i >= 0; i--) {
  const animal = state.animals[i];
  
  // Despawn far animals
  if (Math.abs(animal.x - player.x) > 3000) {
    state.animals.splice(i, 1);
    continue;
  }

  if (animal.health <= 0) {
    if (animal.type === AnimalType.COCOA_CAT) {
      state.cocoaCatDefeated = true;
      [BlockType.COCOA_HELMET, BlockType.COCOA_CHESTPLATE, BlockType.COCOA_LEGGINGS, BlockType.COCOA_BOOTS].forEach(type => {
        state.droppedItems.push({
          x: animal.x + animal.width / 2 - 8,
          y: animal.y + animal.height / 2 - 8,
          vx: (Math.random() - 0.5) * 8,
          vy: -6,
          type,
          id: Math.random()
        });
      });
    } else if (animal.type !== AnimalType.ANT) {
      const isSnake = animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE;
      const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR;
      state.droppedItems.push({
        x: animal.x + animal.width / 2 - 8,
        y: animal.y + animal.height / 2 - 8,
        vx: (Math.random() - 0.5) * 4,
        vy: -4,
        type: isSnake || isCat ? BlockType.FANG : BlockType.MEAT,
        id: Math.random()
      });
      if (isCat) {
        state.droppedItems.push({
          x: animal.x + animal.width / 2 - 8,
          y: animal.y + animal.height / 2 - 8,
          vx: (Math.random() - 0.5) * 4,
          vy: -4,
          type: BlockType.MEAT,
          id: Math.random()
        });
      }
    }
    state.animals.splice(i, 1);
    continue;
  }

  if (animal.hurtTime > 0) animal.hurtTime--;
  if (animal.attackTimer && animal.attackTimer > 0) animal.attackTimer--;
  if (animal.chargeTimer && animal.chargeTimer > 0) animal.chargeTimer--;

  if (Math.random() < 0.002 && Math.abs(animal.x - player.x) < 800 && Math.abs(animal.y - player.y) < 600) {
    playAnimalSfx(animal, 'ambient');
  }

  if (animal.poisonTimer && animal.poisonTimer > 0) {
    animal.poisonTimer--;
    if (animal.poisonTick && animal.poisonTick > 0) {
      animal.poisonTick--;
      if (animal.poisonTick <= 0) {
        const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR || animal.type === AnimalType.COCOA_CAT;
        animal.health -= isCat ? 1 : 3; // 1 damage for cats, 3 for others
        playAnimalSfx(animal, 'normal');
        animal.hurtTime = 10;
        animal.poisonTick = isCat ? 120 : 60;
      }
    }
  }

  let touchingMagma = false;
  const magmaStartX = Math.floor(animal.x / TILE_SIZE);
  const magmaEndX = Math.floor((animal.x + animal.width) / TILE_SIZE);
  const magmaStartY = Math.floor(animal.y / TILE_SIZE);
  const magmaEndY = Math.floor((animal.y + animal.height) / TILE_SIZE);
  for (let x = magmaStartX; x <= magmaEndX; x++) {
    for (let y = magmaStartY; y <= magmaEndY; y++) {
      if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
        if (state.world[x][y] === BlockType.MAGMA) touchingMagma = true;
      }
    }
  }

  if (touchingMagma && animal.hurtTime <= 0) {
    animal.health -= 2;
    animal.hurtTime = 30;
    playAnimalSfx(animal, 'normal');
  }

  const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR;
  if (isCat && animal.health < 20) {
    animal.regenTimer++;
    if (animal.regenTimer >= 60) {
      animal.health++;
      animal.regenTimer = 0;
    }
  }

  animal.stateTime--;
  
  let targetX: number | null = null;
  let isTargetingPlayer = false;
  let fleeX: number | null = null;
  
  // Flee from predators
  if (animal.type === AnimalType.PIG || animal.type === AnimalType.COW || animal.type === AnimalType.CHICKEN) {
    // Flee from player if hurt recently, unless they have charge attack pattern
    if (animal.hurtTime > 0) {
      if (animal.attackPattern === 'charge') {
        animal.aggro = true;
      } else {
        fleeX = player.x;
      }
    }
    
    if (animal.aggro) {
      const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
      if (distToPlayer > 600) {
        animal.aggro = false; // Lose aggro if player runs far away
      } else {
        targetX = player.x;
        isTargetingPlayer = true;
      }
    } else if (fleeX === null) {
      // Flee from snakes – use spatial hash for O(1) lookup
      const nearbyForFlee = animalGrid.queryRadius(animal.x, animal.y, 200);
      for (const other of nearbyForFlee) {
        if (other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) {
          if (Math.hypot(animal.x - other.x, animal.y - other.y) < 200) {
            fleeX = other.x;
            break;
          }
        }
      }
    }
  } else if (animal.type === AnimalType.ANT) {
    const nearbyForAnt = animalGrid.queryRadius(animal.x, animal.y, 150);
    for (const other of nearbyForAnt) {
      if (other.type === AnimalType.CHICKEN || other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) {
        if (Math.hypot(animal.x - other.x, animal.y - other.y) < 150) {
          fleeX = other.x;
          break;
        }
      }
    }
  } else if (animal.type === AnimalType.BIRD) {
    if (animal.hurtTime > 0) {
      fleeX = player.x;
    }
  } else if (animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) {
    if (animal.hurtTime > 0) {
      fleeX = player.x;
    }
  }

  // Shark attacks player if player is in water and close
  if (animal.type === AnimalType.SHARK && fleeX === null) {
    const playerInWater = state.world[Math.floor(player.x / TILE_SIZE)]?.[Math.floor(player.y / TILE_SIZE)] === BlockType.WATER ||
                          state.world[Math.floor(player.x / TILE_SIZE)]?.[Math.floor((player.y + player.height) / TILE_SIZE)] === BlockType.WATER;
    if (playerInWater) {
      const dist = Math.hypot(animal.x - player.x, animal.y - player.y);
      if (dist < 300) {
        targetX = player.x;
        isTargetingPlayer = true;
      }
    }
  }

  // Orca attacks other sea animals
  if (animal.type === AnimalType.ORCA && fleeX === null) {
    let closestDist = 400;
    let targetAnimal = null;
    const nearbyForOrca = animalGrid.queryRadius(animal.x, animal.y, 400);
    for (const other of nearbyForOrca) {
      if (other.id !== animal.id && (other.type === AnimalType.FISH || other.type === AnimalType.DOLPHIN || other.type === AnimalType.SHARK)) {
        const dist = Math.hypot(animal.x - other.x, animal.y - other.y);
        if (dist < closestDist) {
          closestDist = dist;
          targetAnimal = other;
        }
      }
    }
    if (targetAnimal) {
      targetX = targetAnimal.x;
      // If close enough, attack
      if (closestDist < 40 && (animal.attackCooldown <= 0)) {
        targetAnimal.health -= 5;
        playAnimalSfx(targetAnimal, 'normal');
        targetAnimal.hurtTime = 20;
        animal.attackCooldown = 60; // 1 second cooldown
        animal.attackTimer = 15;
      }
    }
  }

  // Seek food if not fleeing
  if (fleeX === null && targetX === null) {
    if (animal.type === AnimalType.PIG || animal.type === AnimalType.COW || animal.type === AnimalType.CHICKEN) {
       // Seek dropped apple/worm (pre-filtered list, no full scan)
       let closestDist = 300;
       for (const item of foodItems) {
         const dist = Math.hypot(animal.x - item.x, animal.y - item.y);
         if (dist < closestDist) {
           closestDist = dist;
           targetX = item.x;
         }
       }
       if (targetX === null) {
         // Look for tall grass using squared distance to avoid sqrt
         const searchRadius = 5;
         const tileX = Math.floor(animal.x / TILE_SIZE);
         const tileY = Math.floor(animal.y / TILE_SIZE);
         let closestGrassSq = 300 * 300;
         for (let dx = -searchRadius; dx <= searchRadius; dx++) {
           for (let dy = -searchRadius; dy <= searchRadius; dy++) {
             const x = tileX + dx;
             const y = tileY + dy;
             if (state.world[x] && isDecorationBlock(state.world[x][y])) {
               const distSq = (dx * TILE_SIZE) ** 2 + (dy * TILE_SIZE) ** 2;
               if (distSq < closestGrassSq) {
                 closestGrassSq = distSq;
                 targetX = x * TILE_SIZE;
               }
             }
           }
         }
       }
    } else if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) {
       if (animal.aggro) {
         const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
         if (distToPlayer > 600) {
           animal.aggro = false; // Lose aggro if player runs far away
         } else {
           targetX = player.x;
           isTargetingPlayer = true;
         }
       }
       
       if (!animal.aggro) {
         // Seek prey – use spatial hash
         let closestDist = 250;
         const nearbyForSnake = animalGrid.queryRadius(animal.x, animal.y, 250);
         for (const other of nearbyForSnake) {
           if (other.type === AnimalType.PIG || other.type === AnimalType.CHICKEN || other.type === AnimalType.ANT) {
             const dist = Math.hypot(animal.x - other.x, animal.y - other.y);
             if (dist < closestDist) {
               closestDist = dist;
               targetX = other.x;
             }
           }
         }
       }
    } else if (animal.type === AnimalType.ANT) {
       // Seek dropped apple/worm (pre-filtered list, no full scan)
       let closestDist = 200;
       for (const item of foodItems) {
         const dist = Math.hypot(animal.x - item.x, animal.y - item.y);
         if (dist < closestDist) {
           closestDist = dist;
           targetX = item.x;
         }
       }
    } else if (animal.type === AnimalType.BIRD) {
      // Birds fly around randomly
      if (Math.random() < 0.02) {
        animal.facing = Math.random() > 0.5 ? 1 : -1;
      }
      targetX = animal.x + animal.facing * 100;
    } else if (animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) {
      // Fish swim around randomly
      if (Math.random() < 0.02) {
        animal.facing = Math.random() > 0.5 ? 1 : -1;
      }
      targetX = animal.x + animal.facing * 100;
    } else if (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR) {
      let closestDist = 400;
      let targetEntity: {x: number, y: number} | null = null;
      
      // Check player
      const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
      if (!animal.tamed && distToPlayer < closestDist) {
        closestDist = distToPlayer;
        targetEntity = player;
      }
      
      // Check other animals – use spatial hash
      const nearbyForCat = animalGrid.queryRadius(animal.x, animal.y, closestDist);
      for (const other of nearbyForCat) {
        if (other.id !== animal.id && other.type !== AnimalType.LEOPARD && other.type !== AnimalType.JAGUAR && other.type !== AnimalType.BLACK_JAGUAR) {
          const dist = Math.hypot(animal.x - other.x, animal.y - other.y);
          if (dist < closestDist) {
            closestDist = dist;
            targetEntity = other;
          }
        }
      }
      
      if (targetEntity) {
        targetX = targetEntity.x;
        if (targetEntity === player) isTargetingPlayer = true;
      } else if (animal.tamed && distToPlayer > 100) {
        targetX = player.x;
        isTargetingPlayer = true;
      } else {
        // Wander randomly
        if (Math.random() < 0.01) {
          animal.facing = Math.random() > 0.5 ? 1 : -1;
        }
        targetX = animal.x + animal.facing * 100;
      }
    }
  }

  if (fleeX !== null) {
    animal.state = 'walking';
    animal.facing = animal.x > fleeX ? 1 : -1;
    animal.stateTime = 10; // Keep fleeing
  } else if (targetX !== null) {
    animal.state = 'walking';
    animal.facing = targetX > animal.x ? 1 : -1;
    animal.stateTime = 10; // Keep seeking
  } else if (animal.stateTime <= 0) {
    if (animal.state === 'idle') {
      animal.state = 'walking';
      animal.facing = Math.random() > 0.5 ? 1 : -1;
      animal.stateTime = 30 + Math.random() * 60;
    } else {
      animal.state = 'idle';
      animal.stateTime = 60 + Math.random() * 120;
    }
  }

  if (animal.type === AnimalType.COCOA_CAT) {
    const hasFullCocoaArmor = player.inventory[BlockType.COCOA_HELMET] > 0 &&
                              player.inventory[BlockType.COCOA_CHESTPLATE] > 0 &&
                              player.inventory[BlockType.COCOA_LEGGINGS] > 0 &&
                              player.inventory[BlockType.COCOA_BOOTS] > 0;
    if (isIntersecting(animal, player)) {
      if (!hasFullCocoaArmor || player.isFlying) {
        player.health = 0;
      }
    }
    if (player.y < 30 * TILE_SIZE && !hasFullCocoaArmor) {
      targetX = player.x;
      isTargetingPlayer = true;
      if (Math.abs(player.x - animal.x) < 150 && animal.attackCooldown <= 0) {
        animal.state = 'attacking';
        animal.stateTime = 30;
        animal.attackCooldown = 60;
        animal.attackTimer = 15;
      }
    }
  }

  if (animal.state === 'walking') {
    let speed = 1;
    if (fleeX !== null) speed = 2.5; // Run faster when fleeing
    else if (targetX !== null) speed = 1.5; // Walk faster when seeking
    
    if (animal.type === AnimalType.CHICKEN) speed *= 1.5;
    else if ((animal.type === AnimalType.PIG || animal.type === AnimalType.COW) && animal.aggro) speed *= 2.5; // Charge fast
    else if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) speed *= 1.5;
    else if (animal.type === AnimalType.ANT) speed *= 0.5;
    else if (animal.type === AnimalType.SHARK && isTargetingPlayer) speed *= 2.0; // Sharks swim fast when attacking
    else if (animal.type === AnimalType.ORCA && targetX !== null) speed *= 2.0; // Orcas swim fast when attacking
    else if (animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN) speed *= 1.5;
    else if (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR) {
      speed *= (isTargetingPlayer ? 2.5 : 1.0); // Sprint when attacking
    } else if (animal.type === AnimalType.COCOA_CAT) {
      speed *= (isTargetingPlayer ? 3.0 : 1.0);
    }
    
    animal.vx = speed * animal.facing;
  } else if (animal.state === 'launching') {
    // Keep current vx
  } else {
    animal.vx = 0;
  }

  // Apply gravity
  let inWater = false;
  let inTree = false;
  const aStartX = Math.floor(animal.x / TILE_SIZE);
  const aEndX = Math.floor((animal.x + animal.width) / TILE_SIZE);
  const aStartY = Math.floor(animal.y / TILE_SIZE);
  const aEndY = Math.floor((animal.y + animal.height) / TILE_SIZE);
  for (let x = aStartX; x <= aEndX; x++) {
    for (let y = aStartY; y <= aEndY; y++) {
      if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
        const block = state.world[x][y];
        if (block === BlockType.WATER || block === BlockType.MAGMA) inWater = true;
        if (isTreeBlock(block)) {
          inTree = true;
        }
      }
    }
  }

  if (animal.type === AnimalType.BIRD) {
    // Birds fly
    animal.vy += (Math.random() - 0.5) * 0.5;
    if (animal.vy > 2) animal.vy = 2;
    if (animal.vy < -2) animal.vy = -2;
    // Keep above ground
    const surfaceY = getSurfaceY(Math.floor(animal.x / TILE_SIZE)) * TILE_SIZE;
    if (animal.y > surfaceY - 50) {
      animal.vy -= 0.5;
    }
  } else if (animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) {
    // Fish swim in water
    if (inWater) {
      animal.vy += (Math.random() - 0.5) * 0.2;
      if (animal.type === AnimalType.SHARK && isTargetingPlayer) {
         // Swim towards player vertically
         if (player.y < animal.y) animal.vy -= 0.2;
         else if (player.y > animal.y) animal.vy += 0.2;
      } else if (animal.type === AnimalType.ORCA && targetX !== null) {
         // Swim towards target vertically
         let targetY = animal.y;
         for (const other of state.animals) {
           if (Math.abs(other.x - targetX) < 4) {
             targetY = other.y;
             break;
           }
         }
         if (targetY < animal.y) animal.vy -= 0.2;
         else if (targetY > animal.y) animal.vy += 0.2;
      }
      if (animal.vy > 1) animal.vy = 1;
      if (animal.vy < -1) animal.vy = -1;
    } else {
      // Flop out of water
      animal.vy += GRAVITY;
    }
  } else if ((animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) && inTree && animal.state !== 'launching') {
    // Snakes can climb trees
    animal.vy = 0;
    if (targetX !== null) {
      let targetY = animal.y;
      if (animal.aggro) {
        targetY = player.y;
      } else {
        for (const other of state.animals) {
          if (Math.abs(other.x - targetX) < 4) {
            targetY = other.y;
            break;
          }
        }
      }
      if (targetY < animal.y - 10) animal.vy = -1;
      else if (targetY > animal.y + 10) animal.vy = 1;
    } else {
      // Wander vertically slightly
      if (Math.random() < 0.05) {
        animal.vy = (Math.random() > 0.5 ? 1 : -1);
      }
    }
  } else {
    animal.vy += GRAVITY;
  }

  // Horizontal movement
  if ((animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) && !inWater) {
    animal.vx = 0; // Can't move horizontally out of water
  } else {
    animal.x += animal.vx;
  }
  if (checkCollision(animal, animal.type)) {
    if (animal.vx > 0) {
      animal.x = Math.floor((animal.x + animal.width) / TILE_SIZE) * TILE_SIZE - animal.width - 0.01;
    } else if (animal.vx < 0) {
      animal.x = Math.floor(animal.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
    }
    animal.vx = 0;
    if (animal.state !== 'launching') {
      const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR;
      if (isCat && targetX !== null && animal.vy === GRAVITY) {
        animal.vy = -11.3; // Jump 5 blocks
      } else {
        animal.facing *= -1; // Turn around
        // Maybe jump
        if (Math.random() < 0.5 && animal.vy === GRAVITY) {
          animal.vy = isCat ? -11.3 : -JUMP_FORCE * 0.8;
        }
      }
    }
  }

  // Track fall start
  if (animal.vy > 0 && animal.fallStartY === undefined) {
    animal.fallStartY = animal.y;
  } else if (animal.vy < 0) {
    animal.fallStartY = undefined;
  }

  // Vertical movement
  animal.y += animal.vy;
  if (checkCollision(animal, animal.type)) {
    if (animal.vy > 0) {
      animal.y = Math.floor((animal.y + animal.height) / TILE_SIZE) * TILE_SIZE - animal.height - 0.01;
      
      // Calculate fall damage
      if (animal.fallStartY !== undefined) {
        const blocksFallen = (animal.y - animal.fallStartY) / TILE_SIZE;
        // Birds, fish, and cats don't take fall damage
        const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR || animal.type === AnimalType.COCOA_CAT;
        const isBird = animal.type === AnimalType.BIRD;
        const isFish = animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK;
        
        if (blocksFallen > 3 && !isCat && !isBird && !isFish) {
          const damage = Math.floor(blocksFallen - 3);
          animal.health -= damage;
          animal.hurtTime = 10;
          playAnimalSfx(animal, 'normal');
        }
        animal.fallStartY = undefined;
      }

      if (animal.state === 'launching') {
        animal.state = 'idle';
        animal.stateTime = 30; // Brief pause after landing
      }
    } else if (animal.vy < 0) {
      animal.y = Math.floor(animal.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
    }
    animal.vy = 0;
  }

  // Snake bite and launch logic
  if (animal.attackCooldown && animal.attackCooldown > 0) {
    animal.attackCooldown--;
  }
  if (animal.launchCooldown && animal.launchCooldown > 0) {
    animal.launchCooldown--;
  }
  
  if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) {
    const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
    
    // Check if player falls on the snake
    if (isIntersecting(animal, player) && player.vy > 0 && !player.grounded) {
      animal.aggro = true;
    }
    
    if (animal.aggro) {
      // Launch at player if close enough and grounded
      if (distToPlayer < 120 && (animal.launchCooldown <= 0) && animal.vy === 0) {
        animal.state = 'launching';
        animal.vy = -6; // Jump up
        animal.vx = (player.x > animal.x ? 1 : -1) * 5; // Leap towards player
        animal.facing = player.x > animal.x ? 1 : -1;
        animal.launchCooldown = 120; // 2 seconds cooldown
      }
      
      // Bite player
      if ((animal.attackCooldown <= 0) && isIntersecting(animal, player)) {
        player.health -= ANIMAL_DEFS[animal.type].attackDamage;
        player.hurtTime = 10;
        player.vy = -3; // Knockback up
        player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
        animal.attackCooldown = 60;
        animal.attackTimer = 15;
        if (animal.type !== AnimalType.TIGER_SNAKE) {
          player.poisonTimer = 300; // 5 seconds at 60fps
          player.poisonTick = 60;
        }
      }
    }
    // Bite other animals – use spatial hash for candidates
    if (animal.attackCooldown <= 0) {
      const nearbyForBite = animalGrid.queryRadius(animal.x, animal.y, 64);
      for (const other of nearbyForBite) {
        if (other !== animal && isIntersecting(animal, other)) {
          // Don't bite other snakes
          if (other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) {
            continue;
          }
          if (animal.type === AnimalType.TIGER_SNAKE) {
            other.health -= 2;
            playAnimalSfx(other, 'normal');
            other.hurtTime = 10;
            other.vy = -3;
            other.vx = (other.x + other.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
            animal.attackCooldown = 60;
            animal.attackTimer = 15;
          } else {
            other.health -= animal.type === AnimalType.STRIPED_SNAKE ? 6 : 1;
            playAnimalSfx(other, 'normal');
            other.hurtTime = 10;
            const isCat = other.type === AnimalType.LEOPARD || other.type === AnimalType.JAGUAR || other.type === AnimalType.BLACK_JAGUAR;
            other.poisonTimer = isCat ? 120 : 300;
            other.poisonTick = isCat ? 120 : 60;
            other.vy = -3;
            other.vx = (other.x + other.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
            animal.attackCooldown = 60;
            animal.attackTimer = 15;
          }
          break; // Only bite one animal per frame
        }
      }
    }
  }

  // Pig and Cow charge logic
  if ((animal.type === AnimalType.PIG || animal.type === AnimalType.COW) && animal.aggro) {
    if ((animal.attackCooldown <= 0) && isIntersecting(animal, player) && !player.isFlying) {
      player.health -= ANIMAL_DEFS[animal.type].attackDamage;
      player.hurtTime = 10;
      player.vy = -3; // Knockback up
      player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 5; // Strong knockback away
      animal.attackCooldown = 60;
      animal.attackTimer = 15;
    }
  }

  // Shark bite logic
  if (animal.type === AnimalType.SHARK) {
    if ((animal.attackCooldown <= 0) && isIntersecting(animal, player) && !player.isFlying) {
      player.health -= ANIMAL_DEFS[animal.type].attackDamage;
      player.hurtTime = 10;
      player.vy = -2; // Knockback up
      player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 3;
      animal.attackCooldown = 60;
      animal.attackTimer = 15;
    }
  }

  // Big Cats bite logic
  if (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR) {
    // Pounce logic
    if (targetX !== null && (animal.launchCooldown <= 0) && animal.vy === 0) {
      const hDist = Math.abs(targetX - animal.x);
      if (hDist < 150 && hDist > 40) {
        animal.state = 'launching';
        animal.vy = -6; // Jump up
        animal.vx = (targetX > animal.x ? 1 : -1) * 6; // Leap towards target
        animal.facing = targetX > animal.x ? 1 : -1;
        animal.launchCooldown = 120; // 2 seconds cooldown
      }
    }

    if ((animal.attackCooldown <= 0)) {
      let attacked = false;
      if (!animal.tamed && isIntersecting(animal, player) && !player.isFlying) {
        player.health -= ANIMAL_DEFS[animal.type].attackDamage;
        player.hurtTime = 10;
        player.vy = -3; // Knockback up
        player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
        animal.attackCooldown = 60;
        animal.attackTimer = 15;
        attacked = true;
      }
      if (!attacked) {
        const nearbyForCatAttack = animalGrid.queryRadius(animal.x, animal.y, 64);
        for (const other of nearbyForCatAttack) {
          if (other.id !== animal.id && other.type !== AnimalType.LEOPARD && other.type !== AnimalType.JAGUAR && other.type !== AnimalType.BLACK_JAGUAR) {
            if (isIntersecting(animal, other)) {
              other.health -= 8;
              playAnimalSfx(other, 'normal');
              other.hurtTime = 10;
              other.vy = -3;
              other.vx = (other.x + other.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
              animal.attackCooldown = 60;
              animal.attackTimer = 15;
              break;
            }
          }
        }
      }
    }
  }
}
};
