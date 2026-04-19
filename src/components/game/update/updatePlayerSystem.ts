import { soundEngine } from '../../../utils/SoundEngine';
import { nextId } from '../ids';
import {
  GRAVITY,
  JUMP_FORCE,
  MAX_DURABILITY,
  MOVE_SPEED,
  REACH,
  SPAWN_X,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../constants';
import { getRequiredProgress } from '../crafting';
import { AnimalType, BlockType } from '../types';
import type { GameState } from '../runtime';
import { hasFullCocoaArmor } from '../runtime';
import type { CollisionChecker } from './updateContext';
import { getSurfaceY } from '../world';
import { resolveX, resolveY } from './collisionUtils';

export const updateInventoryOpenPlayer = ({
  state,
  checkCollision,
}: {
  state: GameState;
  checkCollision: CollisionChecker;
}) => {
  const { player } = state;

  if (!state.isInventoryOpen) {
    return false;
  }

  player.vy += GRAVITY;
  player.grounded = false;
  const prevVy = resolveY(player, checkCollision);
  if (prevVy > 0) player.grounded = true;

  return true;
};

export const updatePlayerActions = ({
  state,
  handleInteract,
}: {
  state: GameState;
  handleInteract: (button: number) => void;
}) => {
  const { player } = state;
if (state.actionCooldown > 0) state.actionCooldown--;

// Continuous placement
if (state.mouse.rightDown && state.actionCooldown === 0) {
  handleInteract(2);
  state.actionCooldown = 10; // Cooldown between placements
}

// Mining logic
if (state.mouse.leftDown) {
  const worldX = state.mouse.x + state.camera.x;
  const worldY = state.mouse.y + state.camera.y;

  let hoveringAnimal = false;
  for (const animal of state.animals) {
    if (
      worldX >= animal.x && worldX <= animal.x + animal.width &&
      worldY >= animal.y && worldY <= animal.y + animal.height
    ) {
      hoveringAnimal = true;
      break;
    }
  }

  const gridX = Math.floor(worldX / TILE_SIZE);
  const gridY = Math.floor(worldY / TILE_SIZE);
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  const currentReach = state.selectedBlock === BlockType.FANG_LANCE ? REACH * 1.5 : REACH;
  const distSq = (worldX - playerCenterX) ** 2 + (worldY - playerCenterY) ** 2;

  if (!hoveringAnimal && distSq <= currentReach * currentReach && gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
    if (state.world[gridX][gridY] !== BlockType.AIR) {
      if (state.mining.x === gridX && state.mining.y === gridY) {
        state.mining.progress += 1;
        const type = state.world[gridX][gridY];

        const hasItem = (state.player.inventory[state.selectedBlock] || 0) > 0;
        const { requiredProgress, canMine } = getRequiredProgress(type, state.selectedBlock, hasItem, state.player.isFlying);

        if (!canMine) {
          state.mining.progress = 0; // Reset progress if can't mine
        } else if (state.mining.progress >= requiredProgress) {
          soundEngine.mine();
          state.world[gridX][gridY] = BlockType.AIR;
          state.mining.progress = 0;

          // Durability logic
          if (hasItem && MAX_DURABILITY[state.selectedBlock] !== undefined) {
            state.player.durability[state.selectedBlock]--;
            if (state.player.durability[state.selectedBlock] <= 0) {
              state.player.inventory[state.selectedBlock]--;
              if (state.player.inventory[state.selectedBlock] > 0) {
                state.player.durability[state.selectedBlock] = MAX_DURABILITY[state.selectedBlock];
              } else {
                state.player.durability[state.selectedBlock] = 0;
              }
            }
            state.invChanged = true;
          }

          let dropType = type;
          if (type === BlockType.COAL_ORE) dropType = BlockType.COAL;
          if (type === BlockType.DIAMOND_ORE) dropType = BlockType.DIAMOND;

          state.droppedItems.push({
            x: gridX * TILE_SIZE + 8,
            y: gridY * TILE_SIZE + 8,
            vx: (Math.random() - 0.5) * 4,
            vy: -4,
            type: dropType,
            id: nextId()
          });
          if ((type === BlockType.LEAVES || type === BlockType.PINE_LEAVES || type === BlockType.PALM_LEAVES) && Math.random() < 0.1) {
            state.droppedItems.push({
              x: gridX * TILE_SIZE + 8,
              y: gridY * TILE_SIZE + 8,
              vx: (Math.random() - 0.5) * 4,
              vy: -4,
              type: BlockType.APPLE,
              id: nextId()
            });
          }
          if (type === BlockType.DIRT && Math.random() < 0.15) {
            state.droppedItems.push({
              x: gridX * TILE_SIZE + 8,
              y: gridY * TILE_SIZE + 8,
              vx: (Math.random() - 0.5) * 4,
              vy: -4,
              type: BlockType.WORM,
              id: nextId()
            });
          }
        }
      } else {
        state.mining.x = gridX;
        state.mining.y = gridY;
        state.mining.progress = 0;
      }
    } else {
      state.mining.progress = 0;
    }
  } else {
    state.mining.progress = 0;
  }
} else {
  state.mining.progress = 0;
}
};

export const updatePlayerState = ({
  state,
  checkCollision,
}: {
  state: GameState;
  checkCollision: CollisionChecker;
}) => {
  const { player, keys } = state;
// Player hurt time update
if (player.hurtTime > 0) player.hurtTime--;
if (player.attackTimer && player.attackTimer > 0) player.attackTimer--;

// Poison logic
if (player.poisonTimer > 0) {
  player.poisonTimer--;
  player.poisonTick--;
  if (player.poisonTick <= 0) {
    player.health -= 3; // 3 hearts per second
    player.hurtTime = 10;
    player.poisonTick = 60;
  }
}

// Check water, cactus, and magma
let inWater = false;
let touchingCactus = false;
let touchingMagma = false;
let touchingPortal = false;
const pStartX = Math.floor(player.x / TILE_SIZE);
const pEndX = Math.floor((player.x + player.width) / TILE_SIZE);
const pStartY = Math.floor(player.y / TILE_SIZE);
const pEndY = Math.floor((player.y + player.height) / TILE_SIZE);
for (let x = pStartX; x <= pEndX; x++) {
  for (let y = pStartY; y <= pEndY; y++) {
    if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
      if (state.world[x][y] === BlockType.WATER || state.world[x][y] === BlockType.MAGMA) inWater = true;
      if (state.world[x][y] === BlockType.CACTUS) touchingCactus = true;
      if (state.world[x][y] === BlockType.MAGMA) touchingMagma = true;
      if (state.world[x][y] === BlockType.COCOA_PORTAL) touchingPortal = true;
    }
  }
}

if (touchingPortal) {
  if (player.x < 89000 * TILE_SIZE) {
    player.x = 90000 * TILE_SIZE;
    player.y = (getSurfaceY(90000) - 2) * TILE_SIZE;
    player.vx = 0;
    player.vy = 0;

    const cocoaCatExists = state.animals.some(a => a.type === AnimalType.COCOA_CAT);
    if (!cocoaCatExists && !state.cocoaCatDefeated) {
      const castleStartX = 90030;
      const castleWidth = 80;
      const throneCenterX = castleStartX + Math.floor(castleWidth / 2);
      const castleY = Math.floor(WORLD_HEIGHT / 2);
      const throneSeatY = castleY - 3;

      const spawnX = throneCenterX * TILE_SIZE - 60; // Center the 120px wide cat
      const spawnY = throneSeatY * TILE_SIZE - 120; // Place on top of the seat

      state.animals.push({
        x: spawnX,
        y: spawnY,
        width: 120,
        height: 120,
        vx: 0,
        vy: 0,
        type: AnimalType.COCOA_CAT,
        id: nextId(),
        state: 'idle',
        stateTime: 100,
        facing: -1,
        health: 500,
        maxHealth: 500,
        hurtTime: 0,
        attackCooldown: 0,
        launchCooldown: 0,
        aggro: false,
        poisonTimer: 0,
        poisonTick: 0,
        regenTimer: 0,
        tamed: false,
        attackTimer: 0,
        attackPattern: 'lunge',
        chargeTimer: 0,
      });
    }
  } else {
    player.x = SPAWN_X * TILE_SIZE;
    player.y = (getSurfaceY(SPAWN_X) - 2) * TILE_SIZE;
    player.vx = 0;
    player.vy = 0;
  }
}

const fullCocoaArmor = hasFullCocoaArmor(player);

if (touchingCactus && player.hurtTime <= 0 && !player.isFlying && !fullCocoaArmor) {
  player.health -= 1;
  player.hurtTime = 30;
  player.vy = -3;
  player.vx = (Math.random() > 0.5 ? 1 : -1) * 3;
}

if (touchingMagma && player.hurtTime <= 0 && !player.isFlying && !fullCocoaArmor) {
  player.health -= 2; // Magma hurts more than cactus
  player.hurtTime = 30;
  // No knockback so player can swim out
}

// Drowning logic
let headInWater = false;
const headY = Math.floor(player.y / TILE_SIZE);
for (let x = pStartX; x <= pEndX; x++) {
  if (x >= 0 && x < WORLD_WIDTH && headY >= 0 && headY < WORLD_HEIGHT) {
    if (state.world[x][headY] === BlockType.WATER) headInWater = true;
  }
}

if (headInWater && !player.isFlying) {
  player.breath--;
  if (player.breath <= 0) {
    player.breath = 0;
    if (state.tick % 60 === 0) {
      player.health -= 1;
      player.hurtTime = 30;
    }
  }
} else {
  player.breath = player.maxBreath;
}

if (player.isFlying) {
  if (keys['KeyA'] || keys['ArrowLeft']) player.vx = -MOVE_SPEED * 2;
  else if (keys['KeyD'] || keys['ArrowRight']) player.vx = MOVE_SPEED * 2;
  else player.vx = 0;

  if (keys['KeyW'] || keys['ArrowUp'] || keys['Space']) player.vy = -MOVE_SPEED * 2;
  else if (keys['KeyS'] || keys['ArrowDown']) player.vy = MOVE_SPEED * 2;
  else player.vy = 0;

  resolveX(player, checkCollision);
  resolveY(player, checkCollision);

  player.grounded = false;
  player.fallStartY = undefined;
  // Flying is creative/debug mode: restore health so the player doesn't die
  // from prior damage but don't suppress incoming damage this frame.
  player.health = player.maxHealth;
} else {
  const speedMultiplier = fullCocoaArmor ? 1.5 : 1;

  // Horizontal movement
  if (keys['KeyA'] || keys['ArrowLeft']) player.vx = -MOVE_SPEED * speedMultiplier * (inWater ? 0.5 : 1);
  else if (keys['KeyD'] || keys['ArrowRight']) player.vx = MOVE_SPEED * speedMultiplier * (inWater ? 0.5 : 1);
  else player.vx = 0;

  resolveX(player, checkCollision);

  // Vertical movement (Gravity and Jumping)
  if (inWater) {
    player.vy += GRAVITY * 0.2; // Slower gravity in water
    if (player.vy > 2) player.vy = 2; // Terminal velocity in water
  } else {
    player.vy += GRAVITY;
  }

  if (keys['KeyW'] || keys['ArrowUp'] || keys['Space']) {
    if (player.grounded) {
      soundEngine.jump();
      player.vy = JUMP_FORCE * speedMultiplier;
      player.grounded = false;
    } else if (inWater) {
      player.vy = JUMP_FORCE * speedMultiplier * 0.4; // Swim up
    }
  }

  // Track fall start
  if (!player.grounded && player.vy > 0 && player.fallStartY === undefined) {
    player.fallStartY = player.y;
  } else if (player.vy < 0) {
    player.fallStartY = undefined;
  }

  player.grounded = false;
  const prevVy = resolveY(player, checkCollision);
  if (prevVy > 0) {
    // Landed on floor
    player.grounded = true;
    if (player.fallStartY !== undefined) {
      const blocksFallen = (player.y - player.fallStartY) / TILE_SIZE;
      if (blocksFallen > 3 && !fullCocoaArmor) {
        player.health -= Math.floor(blocksFallen - 3);
      }
      player.fallStartY = undefined;
    }
  }
}

// Exhaustion logic
if (Math.abs(player.vx) > 0 || Math.abs(player.vy) > 0) player.exhaustion += 0.01;
if (player.exhaustion >= 10) {
  player.exhaustion = 0;
  if (player.hunger > 0) player.hunger -= 1;
}

};
