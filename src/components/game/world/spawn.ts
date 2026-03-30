import { SPAWN_X, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { Animal, AnimalType, BlockType } from '../types';
import { ANIMAL_DEFS } from '../animalDefinitions';
import { getBiome, getSurfaceY } from './generation';

export const getValidSpawnX = (
  type: AnimalType,
  world: BlockType[][],
  playerX?: number,
): number | null => {
  for (let attempt = 0; attempt < 50; attempt++) {
    let x;
    if (playerX !== undefined) {
      const minOffset = 800 / TILE_SIZE;
      const maxOffset = 2500 / TILE_SIZE;
      const offset =
        (Math.random() * (maxOffset - minOffset) + minOffset) * (Math.random() > 0.5 ? 1 : -1);
      x = Math.floor(playerX / TILE_SIZE + offset);
      if (x < 0 || x >= WORLD_WIDTH) continue;
    } else {
      x = Math.floor(Math.random() * WORLD_WIDTH);
    }

    if (x >= 89000 && type !== AnimalType.COCOA_CAT) continue;

    const biomeIndex = getBiome(x);
    const def = ANIMAL_DEFS[type];
    if (!def.spawnBiomes.includes(biomeIndex)) continue;

    if (
      type === AnimalType.SNAKE ||
      type === AnimalType.STRIPED_SNAKE ||
      type === AnimalType.TIGER_SNAKE
    ) {
      const testY = getSurfaceY(x) - 1;
      let hasTree = false;
      for (let y = 0; y <= testY; y++) {
        const block = world[x] && world[x][y];
        if (
          block === BlockType.WOOD ||
          block === BlockType.PINE_WOOD ||
          block === BlockType.PALM_WOOD ||
          block === BlockType.LEAVES ||
          block === BlockType.PINE_LEAVES ||
          block === BlockType.PALM_LEAVES
        ) {
          hasTree = true;
          break;
        }
      }
      if (
        hasTree ||
        (world[x] &&
          (world[x][testY] === BlockType.TALL_GRASS ||
            world[x][testY] === BlockType.FLOWER_BUD ||
            world[x][testY] === BlockType.FLOWER_BLOOM))
      ) {
        return x;
      }
      if (attempt > 20) return x;
    } else {
      return x;
    }
  }

  if (playerX !== undefined) {
    const fallbackX = Math.floor(playerX / TILE_SIZE) + 800 / TILE_SIZE;
    if (fallbackX >= 0 && fallbackX < WORLD_WIDTH) return fallbackX;
  }
  return null;
};

export const spawnAnimals = (world: BlockType[][]): Animal[] => {
  const animals: Animal[] = [];
  const animalTypes = [
    AnimalType.PIG, AnimalType.PIG, AnimalType.PIG,
    AnimalType.COW, AnimalType.COW, AnimalType.COW,
    AnimalType.CHICKEN, AnimalType.CHICKEN, AnimalType.CHICKEN,
    AnimalType.ANT, AnimalType.ANT, AnimalType.ANT,
    AnimalType.SNAKE, AnimalType.STRIPED_SNAKE, AnimalType.TIGER_SNAKE,
    AnimalType.BIRD, AnimalType.BIRD, AnimalType.BIRD,
    AnimalType.FISH, AnimalType.FISH, AnimalType.FISH,
    AnimalType.ORCA, AnimalType.DOLPHIN, AnimalType.SHARK,
    AnimalType.LEOPARD, AnimalType.LEOPARD, AnimalType.JAGUAR, AnimalType.JAGUAR, AnimalType.BLACK_JAGUAR, AnimalType.BLACK_JAGUAR,
  ];

  for (let i = 0; i < 80; i++) {
    const type = animalTypes[Math.floor(Math.random() * animalTypes.length)];
    const x = getValidSpawnX(type, world, SPAWN_X * TILE_SIZE);

    if (x === null) continue;

    const surfaceY = getSurfaceY(x);

    const isWaterAnimal =
      type === AnimalType.FISH ||
      type === AnimalType.ORCA ||
      type === AnimalType.DOLPHIN ||
      type === AnimalType.SHARK;
    if (!isWaterAnimal && type !== AnimalType.BIRD) {
      if (world[x] && world[x][surfaceY] === BlockType.WATER) {
        continue;
      }
    }

    const def = ANIMAL_DEFS[type];
    const { width, height } = def;

    let spawnY = surfaceY - 2;
    if (type === AnimalType.BIRD) {
      spawnY = surfaceY - 10 - Math.floor(Math.random() * 10);
    } else if (isWaterAnimal) {
      let foundWater = false;
      for (let y = surfaceY; y < WORLD_HEIGHT; y++) {
        if (world[x] && world[x][y] === BlockType.WATER) {
          spawnY = y + 1;
          foundWater = true;
          break;
        }
      }
      if (!foundWater) continue;
    } else if (
      type === AnimalType.SNAKE ||
      type === AnimalType.STRIPED_SNAKE ||
      type === AnimalType.TIGER_SNAKE
    ) {
      for (let y = 0; y <= surfaceY; y++) {
        if (
          world[x] &&
          world[x][y] !== BlockType.AIR &&
          world[x][y] !== BlockType.TALL_GRASS &&
          world[x][y] !== BlockType.FLOWER_BUD &&
          world[x][y] !== BlockType.FLOWER_BLOOM
        ) {
          spawnY = y - 1;
          break;
        }
      }
    }

    const numToSpawn =
      type === AnimalType.SNAKE ||
      type === AnimalType.STRIPED_SNAKE ||
      type === AnimalType.TIGER_SNAKE
        ? Math.floor(Math.random() * 3) + 1
        : 1;

    for (let j = 0; j < numToSpawn; j++) {
      animals.push({
        id: Math.random(),
        type,
        x: (x + (Math.random() - 0.5) * 2) * TILE_SIZE,
        y: spawnY * TILE_SIZE,
        vx: 0,
        vy: 0,
        width,
        height,
        facing: Math.random() > 0.5 ? 1 : -1,
        state: 'idle',
        stateTime: Math.random() * 60,
        health: def.health,
        maxHealth: def.health,
        hurtTime: 0,
        attackCooldown: 0,
        launchCooldown: 0,
        aggro: false,
        poisonTimer: 0,
        poisonTick: 0,
        regenTimer: 0,
        tamed: false,
        attackTimer: 0,
        attackPattern: def.attackPattern,
        chargeTimer: 0,
      });
    }
  }

  return animals;
};
