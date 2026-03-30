import { SPAWN_X, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { Animal, AnimalType, BlockType } from './types';
import { ANIMAL_DEFS } from './animalDefinitions';

export const enum BiomeType {
  FOREST        = 0,
  DESERT        = 1,
  SNOW          = 2,
  OCEAN         = 3,
  MOUNTAIN      = 4,
  SNOWY_MOUNTAIN = 5,
  VOLCANO       = 6,
  SWAMP         = 7,
  JUNGLE        = 8,
  BADLANDS      = 9,
}

export const getBiome = (x: number): BiomeType => Math.floor(x / 100) % 10 as BiomeType;

export const getSurfaceY = (x: number) => {
  if (x >= 89000) return Math.floor(WORLD_HEIGHT / 2);
  const biomeIndex = getBiome(x);
  if (biomeIndex === BiomeType.OCEAN) {
    return Math.floor(WORLD_HEIGHT / 2); // Flat water surface for Ocean
  }
  let heightOffset = Math.sin(x / 8) * 4 + Math.sin(x / 3) * 2;
  const biomePos = (x % 100) / 100;
  const mountainHeight = Math.sin(biomePos * Math.PI);

  if (biomeIndex === BiomeType.MOUNTAIN) {
    heightOffset -= mountainHeight * 25;
  } else if (biomeIndex === BiomeType.SNOWY_MOUNTAIN) {
    heightOffset -= mountainHeight * 15;
  } else if (biomeIndex === BiomeType.VOLCANO) {
    heightOffset -= mountainHeight * 20;
    if (biomePos > 0.4 && biomePos < 0.6) {
      heightOffset += 5; // Crater
    }
  } else if (biomeIndex === BiomeType.SWAMP) {
    heightOffset += 2;
  } else if (biomeIndex === BiomeType.BADLANDS) {
    heightOffset -= mountainHeight * 15; // Plateaus
  }

  let actualSurfaceY = Math.floor(WORLD_HEIGHT / 2 + heightOffset);
  if (biomeIndex === BiomeType.SWAMP) {
    actualSurfaceY += 1; // Shallow water for swamp
  }
  return actualSurfaceY;
};

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
  // Fallback: return a valid x near the player rather than null
  if (playerX !== undefined) {
    const fallbackX = Math.floor(playerX / TILE_SIZE) + 800 / TILE_SIZE;
    if (fallbackX >= 0 && fallbackX < WORLD_WIDTH) return fallbackX;
  }
  return null;
};

export const generateWorld = (): BlockType[][] => {
  const world: BlockType[][] = Array(WORLD_WIDTH)
    .fill(0)
    .map(() => Array(WORLD_HEIGHT).fill(BlockType.AIR));

  let grassPatch = 0;

  const hasPortal = true;

  for (let x = 0; x < WORLD_WIDTH; x++) {
    // Determine biome based on x coordinate (100 blocks per biome, cycling through 10 biomes)
    const biomeIndex = getBiome(x);

    let heightOffset = Math.sin(x / 8) * 4 + Math.sin(x / 3) * 2;
    const biomePos = (x % 100) / 100;
    const mountainHeight = Math.sin(biomePos * Math.PI);

    if (biomeIndex === BiomeType.MOUNTAIN) {
      heightOffset -= mountainHeight * 25;
    } else if (biomeIndex === BiomeType.SNOWY_MOUNTAIN) {
      heightOffset -= mountainHeight * 15;
    } else if (biomeIndex === BiomeType.VOLCANO) {
      heightOffset -= mountainHeight * 20;
      if (biomePos > 0.4 && biomePos < 0.6) {
        heightOffset += 5; // Crater
      }
    } else if (biomeIndex === BiomeType.SWAMP) {
      heightOffset += 2; // Slightly lower
    } else if (biomeIndex === BiomeType.BADLANDS) {
      // Badlands
      heightOffset -= mountainHeight * 15; // Plateaus
    }

    const terrainY = Math.floor(WORLD_HEIGHT / 2 + heightOffset);

    let topBlock = BlockType.GRASS;
    let subBlock = BlockType.DIRT;

    if (biomeIndex === BiomeType.DESERT) {
      topBlock = BlockType.SAND;
      subBlock = BlockType.SAND;
    } else if (biomeIndex === BiomeType.SNOW) {
      topBlock = BlockType.SNOW_GRASS;
      subBlock = BlockType.SNOW_DIRT;
    } else if (biomeIndex === BiomeType.OCEAN) {
      topBlock = BlockType.SAND;
      subBlock = BlockType.SAND;
    } else if (biomeIndex === BiomeType.MOUNTAIN) {
      topBlock = BlockType.STONE;
      subBlock = BlockType.STONE;
    } else if (biomeIndex === BiomeType.SNOWY_MOUNTAIN) {
      topBlock = BlockType.SNOW_GRASS;
      subBlock = BlockType.STONE;
    } else if (biomeIndex === BiomeType.VOLCANO) {
      topBlock = BlockType.OBSIDIAN;
      subBlock = BlockType.STONE;
    } else if (biomeIndex === BiomeType.SWAMP) {
      topBlock = BlockType.MUD;
      subBlock = BlockType.DIRT;
    } else if (biomeIndex === BiomeType.JUNGLE) {
      topBlock = BlockType.GRASS;
      subBlock = BlockType.DIRT;
    } else if (biomeIndex === BiomeType.BADLANDS) {
      topBlock = BlockType.RED_SAND;
      subBlock = BlockType.TERRACOTTA;
    }

    // Adjust surfaceY for ocean and swamp
    let actualSurfaceY = terrainY;
    if (biomeIndex === BiomeType.OCEAN) {
      actualSurfaceY += 8; // Deeper surface for ocean
    } else if (biomeIndex === BiomeType.SWAMP) {
      actualSurfaceY += 1; // Shallow water for swamp
    }

    if (x >= 89000) {
      topBlock = BlockType.COCOA_FUR;
      subBlock = BlockType.DIRT;
      actualSurfaceY = Math.floor(WORLD_HEIGHT / 2);
    }

    const waterLevel = Math.floor(WORLD_HEIGHT / 2);

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      if (
        x < 89000 &&
        ((biomeIndex === BiomeType.OCEAN && y >= waterLevel && y < actualSurfaceY) ||
          (biomeIndex === BiomeType.SWAMP && y >= waterLevel + 2 && y < actualSurfaceY))
      ) {
        world[x][y] = BlockType.WATER;
      } else if (y === actualSurfaceY) {
        if (biomeIndex === BiomeType.VOLCANO && biomePos > 0.45 && biomePos < 0.55) {
          world[x][y] = BlockType.MAGMA;
        } else {
          world[x][y] = topBlock;
        }
      } else if (y > actualSurfaceY && y < actualSurfaceY + 4) {
        if (biomeIndex === BiomeType.VOLCANO && biomePos > 0.4 && biomePos < 0.6) {
          world[x][y] = BlockType.MAGMA;
        } else {
          world[x][y] = subBlock;
        }
      } else if (y >= actualSurfaceY + 4) {
        world[x][y] = BlockType.STONE;
        const depth = y - (actualSurfaceY + 4);
        const rand = Math.random();
        if (biomeIndex === BiomeType.VOLCANO && biomePos > 0.45 && biomePos < 0.55) {
          world[x][y] = BlockType.MAGMA;
        } else if (depth > 20 && rand < 0.005) {
          world[x][y] = BlockType.DIAMOND_ORE;
        } else if (depth > 10 && rand < 0.015) {
          world[x][y] = BlockType.GOLD_ORE;
        } else if (depth > 5 && rand < 0.03) {
          world[x][y] = BlockType.IRON_ORE;
        } else if (rand < 0.05) {
          world[x][y] = BlockType.COAL_ORE;
        }
      }
    }

    const isPortalLocation = x === 1000 || x === 2000 || x === 3000 || x === 89995;
    if (hasPortal && isPortalLocation) {
      const portalX = x;
      const portalY = actualSurfaceY - 1;

      for (let px = portalX - 1; px <= portalX + 2; px++) {
        for (let py = portalY - 5; py <= portalY; py++) {
          if (px >= 0 && px < WORLD_WIDTH && py >= 0 && py < WORLD_HEIGHT) {
            if (px === portalX - 1 || px === portalX + 2 || py === portalY || py === portalY - 5) {
              world[px][py] = BlockType.COCOA_FUR;
            } else {
              world[px][py] = BlockType.COCOA_PORTAL;
            }
          }
        }
      }
    }

    // Generate surface features based on biome
    if (
      x < 89000 &&
      (biomeIndex === BiomeType.FOREST ||
        biomeIndex === BiomeType.SNOW ||
        biomeIndex === BiomeType.DESERT ||
        biomeIndex === BiomeType.OCEAN ||
        biomeIndex === BiomeType.MOUNTAIN ||
        biomeIndex === BiomeType.SNOWY_MOUNTAIN ||
        biomeIndex === BiomeType.SWAMP ||
        biomeIndex === BiomeType.JUNGLE)
    ) {
      // Trees in Forest, Snow, Desert (oasis), Ocean (islands), Swamp, Jungle
      let treeChance = 0;
      if (biomeIndex === BiomeType.FOREST) treeChance = 0.08;
      else if (biomeIndex === BiomeType.SNOW || biomeIndex === BiomeType.SNOWY_MOUNTAIN) treeChance = 0.03;
      else if (biomeIndex === BiomeType.DESERT) treeChance = 0.01;
      else if (biomeIndex === BiomeType.OCEAN) treeChance = 0.02;
      else if (biomeIndex === BiomeType.MOUNTAIN) treeChance = 0.04;
      else if (biomeIndex === BiomeType.SWAMP) treeChance = 0.06;
      else if (biomeIndex === BiomeType.JUNGLE) treeChance = 0.15;

      // Only spawn trees on solid ground (not water)
      const isNearPortal =
        Math.abs(x - 1000) <= 5 ||
        Math.abs(x - 2000) <= 5 ||
        Math.abs(x - 3000) <= 5 ||
        Math.abs(x - 89995) <= 5;
      if (
        !isNearPortal &&
        world[x][actualSurfaceY] !== BlockType.WATER &&
        Math.random() < treeChance &&
        x > 2 &&
        x < WORLD_WIDTH - 2
      ) {
        if (biomeIndex === BiomeType.FOREST || biomeIndex === BiomeType.MOUNTAIN || biomeIndex === BiomeType.SWAMP) {
          // Oak / Willow Tree
          const treeHeight = Math.floor(Math.random() * 3) + 3;
          for (let i = 1; i <= treeHeight; i++) {
            world[x][actualSurfaceY - i] = biomeIndex === BiomeType.SWAMP ? BlockType.JUNGLE_WOOD : BlockType.WOOD;
          }
          const topY = actualSurfaceY - treeHeight;
          const leaf = biomeIndex === BiomeType.SWAMP ? BlockType.JUNGLE_LEAVES : BlockType.LEAVES;
          world[x][topY] = leaf;
          world[x - 1][topY] = leaf;
          world[x + 1][topY] = leaf;
          world[x][topY - 1] = leaf;
          world[x - 1][topY + 1] = leaf;
          world[x + 1][topY + 1] = leaf;
        } else if (biomeIndex === BiomeType.SNOW || biomeIndex === BiomeType.SNOWY_MOUNTAIN) {
          // Pine Tree
          const treeHeight = Math.floor(Math.random() * 4) + 4;
          for (let i = 1; i <= treeHeight; i++) {
            world[x][actualSurfaceY - i] = BlockType.PINE_WOOD;
          }
          const topY = actualSurfaceY - treeHeight;
          world[x][topY] = BlockType.PINE_LEAVES;
          world[x][topY - 1] = BlockType.PINE_LEAVES;
          world[x - 1][topY + 1] = BlockType.PINE_LEAVES;
          world[x + 1][topY + 1] = BlockType.PINE_LEAVES;
          world[x - 1][topY + 2] = BlockType.PINE_LEAVES;
          world[x + 1][topY + 2] = BlockType.PINE_LEAVES;
          world[x - 2][topY + 2] = BlockType.PINE_LEAVES;
          world[x + 2][topY + 2] = BlockType.PINE_LEAVES;
        } else if (biomeIndex === BiomeType.DESERT || biomeIndex === BiomeType.OCEAN) {
          // Palm Tree
          const treeHeight = Math.floor(Math.random() * 3) + 4;
          for (let i = 1; i <= treeHeight; i++) {
            // Slight curve
            const offsetX = i > 3 ? 1 : 0;
            world[x + offsetX][actualSurfaceY - i] = BlockType.PALM_WOOD;
          }
          const topX = x + (treeHeight > 3 ? 1 : 0);
          const topY = actualSurfaceY - treeHeight;
          world[topX][topY] = BlockType.PALM_LEAVES;
          world[topX - 1][topY] = BlockType.PALM_LEAVES;
          world[topX + 1][topY] = BlockType.PALM_LEAVES;
          world[topX - 2][topY + 1] = BlockType.PALM_LEAVES;
          world[topX + 2][topY + 1] = BlockType.PALM_LEAVES;
          world[topX][topY - 1] = BlockType.PALM_LEAVES;
        } else if (biomeIndex === BiomeType.JUNGLE) {
          // Jungle Tree
          const treeHeight = Math.floor(Math.random() * 5) + 5;
          for (let i = 1; i <= treeHeight; i++) {
            world[x][actualSurfaceY - i] = BlockType.JUNGLE_WOOD;
          }
          const topY = actualSurfaceY - treeHeight;
          world[x][topY] = BlockType.JUNGLE_LEAVES;
          world[x - 1][topY] = BlockType.JUNGLE_LEAVES;
          world[x + 1][topY] = BlockType.JUNGLE_LEAVES;
          world[x - 2][topY + 1] = BlockType.JUNGLE_LEAVES;
          world[x + 2][topY + 1] = BlockType.JUNGLE_LEAVES;
          world[x - 1][topY + 1] = BlockType.JUNGLE_LEAVES;
          world[x + 1][topY + 1] = BlockType.JUNGLE_LEAVES;
          world[x][topY - 1] = BlockType.JUNGLE_LEAVES;
          world[x][topY - 2] = BlockType.JUNGLE_LEAVES;
        }
      } else if (biomeIndex === BiomeType.FOREST || biomeIndex === BiomeType.JUNGLE) {
        // Generate tall grass in forest and jungle
        if (Math.random() < (biomeIndex === BiomeType.JUNGLE ? 0.2 : 0.05)) {
          grassPatch = Math.floor(Math.random() * 5) + 3; // 3 to 7 blocks wide
        }
        if (grassPatch > 0 && world[x][actualSurfaceY - 1] === BlockType.AIR) {
          if (Math.random() < 0.1) {
            world[x][actualSurfaceY - 1] = BlockType.FLOWER_BUD;
          } else {
            world[x][actualSurfaceY - 1] = BlockType.TALL_GRASS;
          }
          grassPatch--;
        }
      }
    } else if (biomeIndex === BiomeType.DESERT || biomeIndex === BiomeType.BADLANDS) {
      // Cactus in Desert and Badlands
      if (Math.random() < 0.05 && x > 2 && x < WORLD_WIDTH - 2) {
        const cactusHeight = Math.floor(Math.random() * 3) + 2;
        for (let i = 1; i <= cactusHeight; i++) {
          world[x][actualSurfaceY - i] = BlockType.CACTUS;
        }
      }
    } else if (biomeIndex === BiomeType.OCEAN) {
      // Coral in Ocean
      if (Math.random() < 0.2) {
        world[x][actualSurfaceY - 1] = BlockType.CORAL;
      }
    }
  }

  // Generate Cocoa Castle
  const castleStartX = 90030;
  const castleWidth = 80;
  const castleHeight = 35;
  const castleY = Math.floor(WORLD_HEIGHT / 2);

  for (let cx = castleStartX; cx < castleStartX + castleWidth; cx++) {
    for (let cy = castleY - castleHeight - 1; cy <= castleY; cy++) {
      if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT) {
        const isTower = cx < castleStartX + 8 || cx >= castleStartX + castleWidth - 8;
        const wallHeight = isTower ? castleHeight : castleHeight - 10;

        if (cy > castleY - wallHeight - 1) {
          // Battlements
          if (cy === castleY - wallHeight - 1) {
            if (cx % 2 === 0) world[cx][cy] = BlockType.OBSIDIAN;
          }
          // Walls
          else if (
            cx === castleStartX ||
            cx === castleStartX + castleWidth - 1 ||
            cx === castleStartX + 7 ||
            cx === castleStartX + castleWidth - 8
          ) {
            world[cx][cy] = BlockType.OBSIDIAN;
          }
          // Floor and Ceiling
          else if (cy === castleY || cy === castleY - wallHeight) {
            world[cx][cy] = BlockType.OBSIDIAN;
          }
          // Inside
          else {
            world[cx][cy] = BlockType.AIR;
          }
        }
      }
    }
  }

  // Doorways
  for (let cy = castleY - 6; cy <= castleY; cy++) {
    world[castleStartX][cy] = BlockType.AIR;
    world[castleStartX + 7][cy] = BlockType.AIR;
    world[castleStartX + castleWidth - 8][cy] = BlockType.AIR;
    world[castleStartX + castleWidth - 1][cy] = BlockType.AIR;
  }

  // Red Carpet
  for (let cx = castleStartX + 1; cx < castleStartX + castleWidth - 1; cx++) {
    if (
      world[cx][castleY] === BlockType.OBSIDIAN &&
      cx > castleStartX + 7 &&
      cx < castleStartX + castleWidth - 8
    ) {
      world[cx][castleY - 1] = BlockType.TERRACOTTA;
    }
  }

  // Throne
  const throneCenterX = castleStartX + Math.floor(castleWidth / 2);
  const throneBaseY = castleY - 1;

  // Throne Base (Gold)
  for (let i = -3; i <= 3; i++) {
    world[throneCenterX + i][throneBaseY] = BlockType.GOLD_BLOCK;
  }
  for (let i = -2; i <= 2; i++) {
    world[throneCenterX + i][throneBaseY - 1] = BlockType.GOLD_BLOCK;
  }

  // Throne Seat (Diamond)
  for (let i = -1; i <= 1; i++) {
    world[throneCenterX + i][throneBaseY - 2] = BlockType.DIAMOND_BLOCK;
  }

  // Throne Back (Gold & Diamond)
  world[throneCenterX - 1][throneBaseY - 3] = BlockType.GOLD_BLOCK;
  world[throneCenterX][throneBaseY - 3] = BlockType.DIAMOND_BLOCK;
  world[throneCenterX + 1][throneBaseY - 3] = BlockType.GOLD_BLOCK;

  world[throneCenterX - 1][throneBaseY - 4] = BlockType.GOLD_BLOCK;
  world[throneCenterX][throneBaseY - 4] = BlockType.DIAMOND_BLOCK;
  world[throneCenterX + 1][throneBaseY - 4] = BlockType.GOLD_BLOCK;

  world[throneCenterX][throneBaseY - 5] = BlockType.GOLD_BLOCK;

  return world;
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
    let x = getValidSpawnX(type, world, SPAWN_X * TILE_SIZE);

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
      // Find water
      let foundWater = false;
      for (let y = surfaceY; y < WORLD_HEIGHT; y++) {
        if (world[x] && world[x][y] === BlockType.WATER) {
          spawnY = y + 1;
          foundWater = true;
          break;
        }
      }
      if (!foundWater) continue; // Don't spawn fish if no water
    } else if (
      type === AnimalType.SNAKE ||
      type === AnimalType.STRIPED_SNAKE ||
      type === AnimalType.TIGER_SNAKE
    ) {
      // Find the highest block in this column (could be a tree)
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
        regenTimer: 0,
        attackPattern: def.attackPattern,
      });
    }
  }
  return animals;
};
