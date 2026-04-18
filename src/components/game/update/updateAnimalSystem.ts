import { soundEngine } from '../../../utils/SoundEngine';
import { GRAVITY, REACH, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { getMaxStack } from '../crafting';
import type { GameState } from '../runtime';
import {
  isTransparentBlock,
} from '../runtime';
import { AnimalType, BlockType } from '../types';
import type { Animal } from '../types';
import type { CollisionChecker, Intersector } from './updateContext';
import { getSurfaceY, getValidSpawnX } from '../world';
import { SpatialHash } from '../spatialHash';
import { ANIMAL_DEFS } from '../animalDefinitions';
import {
  computeAnimalTarget,
  applyMovementState,
  applyCocoaCatBehavior,
  applyMovementSpeed,
} from './animalBehavior';
import { applyAnimalPhysics } from './animalPhysics';
import { applyAnimalCombat } from './animalCombat';

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

const handleAnimalDeath = (animal: Animal, state: GameState): void => {
  if (animal.type === AnimalType.COCOA_CAT) {
    state.cocoaCatDefeated = true;
    [BlockType.COCOA_HELMET, BlockType.COCOA_CHESTPLATE, BlockType.COCOA_LEGGINGS, BlockType.COCOA_BOOTS].forEach(type => {
      state.droppedItems.push({
        x: animal.x + animal.width / 2 - 8,
        y: animal.y + animal.height / 2 - 8,
        vx: (Math.random() - 0.5) * 8,
        vy: -6,
        type,
        id: Math.random(),
      });
    });
  } else if (animal.type !== AnimalType.ANT) {
    const isSnake =
      animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE;
    const isCat =
      animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR;
    state.droppedItems.push({
      x: animal.x + animal.width / 2 - 8,
      y: animal.y + animal.height / 2 - 8,
      vx: (Math.random() - 0.5) * 4,
      vy: -4,
      type: isSnake || isCat ? BlockType.FANG : BlockType.MEAT,
      id: Math.random(),
    });
    if (isCat) {
      state.droppedItems.push({
        x: animal.x + animal.width / 2 - 8,
        y: animal.y + animal.height / 2 - 8,
        vx: (Math.random() - 0.5) * 4,
        vy: -4,
        type: BlockType.MEAT,
        id: Math.random(),
      });
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
      source: { x: animal.x + animal.width / 2, y: animal.y + animal.height / 2 },
      listener: { x: listenerX, y: listenerY },
      maxDistance: priority === 'ambient' ? 900 : 1400,
    });
  };

  // Rebuild spatial hash each frame for O(1) neighbor lookups
  animalGrid.clear();
  for (const a of state.animals) animalGrid.insert(a);

  // Pre-filter food items once per frame so herbivores/ants don't scan all dropped items
  const foodItems = state.droppedItems.filter(
    item => item.type === BlockType.APPLE || item.type === BlockType.WORM,
  );

  for (let i = state.animals.length - 1; i >= 0; i--) {
    const animal = state.animals[i];

    if (Math.abs(animal.x - player.x) > 3000) {
      state.animals.splice(i, 1);
      continue;
    }

    if (animal.health <= 0) {
      handleAnimalDeath(animal, state);
      state.animals.splice(i, 1);
      continue;
    }

    // General timer ticks
    if (animal.hurtTime > 0) animal.hurtTime--;
    if (animal.attackTimer > 0) animal.attackTimer--;
    if (animal.chargeTimer > 0) animal.chargeTimer--;

    // Ambient sound
    if (Math.random() < 0.002 && Math.abs(animal.x - player.x) < 800 && Math.abs(animal.y - player.y) < 600) {
      playAnimalSfx(animal, 'ambient');
    }

    // Poison tick
    if (animal.poisonTimer > 0) {
      animal.poisonTimer--;
      if (animal.poisonTick > 0) {
        animal.poisonTick--;
        if (animal.poisonTick <= 0) {
          const isCat =
            animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR ||
            animal.type === AnimalType.BLACK_JAGUAR || animal.type === AnimalType.COCOA_CAT;
          animal.health -= isCat ? 1 : 3;
          playAnimalSfx(animal, 'normal');
          animal.hurtTime = 10;
          animal.poisonTick = isCat ? 120 : 60;
        }
      }
    }

    // Magma contact damage
    let touchingMagma = false;
    for (let x = Math.floor(animal.x / TILE_SIZE); x <= Math.floor((animal.x + animal.width) / TILE_SIZE); x++) {
      for (let y = Math.floor(animal.y / TILE_SIZE); y <= Math.floor((animal.y + animal.height) / TILE_SIZE); y++) {
        if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT && state.world[x][y] === BlockType.MAGMA) {
          touchingMagma = true;
        }
      }
    }
    if (touchingMagma && animal.hurtTime <= 0) {
      animal.health -= 2;
      animal.hurtTime = 30;
      playAnimalSfx(animal, 'normal');
    }

    // Cat health regeneration when low
    const isCat =
      animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR;
    if (isCat && animal.health < 20) {
      animal.regenTimer++;
      if (animal.regenTimer >= 60) { animal.health++; animal.regenTimer = 0; }
    }

    animal.stateTime--;

    const intent = computeAnimalTarget(animal, state, animalGrid, foodItems, playAnimalSfx);
    applyMovementState(animal, intent);
    applyCocoaCatBehavior(animal, state, intent, isIntersecting);
    applyMovementSpeed(animal, intent);
    applyAnimalPhysics(animal, state, checkCollision, intent, playAnimalSfx);
    applyAnimalCombat(animal, state, animalGrid, isIntersecting, playAnimalSfx, intent);
  }
};
