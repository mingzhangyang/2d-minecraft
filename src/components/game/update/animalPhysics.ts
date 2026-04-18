import { BIRD_MIN_HEIGHT_ABOVE_SURFACE, CAT_JUMP_VELOCITY, GRAVITY, JUMP_FORCE, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import type { GameState } from '../runtime';
import { isTreeBlock } from '../runtime';
import { AnimalType, BlockType } from '../types';
import type { Animal } from '../types';
import type { CollisionChecker } from './updateContext';
import type { AnimalIntent } from './animalBehavior';
import { getSurfaceY } from '../world';

type SfxPlayer = (animal: Animal, priority?: 'ambient' | 'normal') => void;

/**
 * Applies gravity, water/tree buoyancy, horizontal and vertical movement,
 * AABB collision resolution, and fall damage for one animal per frame.
 *
 * Must be called after applyMovementSpeed so vx is already set.
 * Must be called before applyAnimalCombat so vy reflects whether the animal
 * is grounded (combat checks animal.vy === 0 for launch conditions).
 */
export const applyAnimalPhysics = (
  animal: Animal,
  state: GameState,
  checkCollision: CollisionChecker,
  intent: AnimalIntent,
  playAnimalSfx: SfxPlayer,
): void => {
  const { targetX, isTargetingPlayer } = intent;

  // Detect water and tree contact for the full bounding box
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
        if (isTreeBlock(block)) inTree = true;
      }
    }
  }

  // --- Vertical velocity ---
  if (animal.type === AnimalType.BIRD) {
    animal.vy += (Math.random() - 0.5) * 0.5;
    if (animal.vy > 2) animal.vy = 2;
    if (animal.vy < -2) animal.vy = -2;
    const surfaceY = getSurfaceY(Math.floor(animal.x / TILE_SIZE)) * TILE_SIZE;
    if (animal.y > surfaceY - BIRD_MIN_HEIGHT_ABOVE_SURFACE) animal.vy -= 0.5;
  } else if (
    animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA ||
    animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK
  ) {
    if (inWater) {
      animal.vy += (Math.random() - 0.5) * 0.2;
      if (animal.type === AnimalType.SHARK && isTargetingPlayer) {
        if (state.player.y < animal.y) animal.vy -= 0.2;
        else if (state.player.y > animal.y) animal.vy += 0.2;
      } else if (animal.type === AnimalType.ORCA && targetX !== null) {
        let targetY = animal.y;
        for (const other of state.animals) {
          if (Math.abs(other.x - targetX) < 4) { targetY = other.y; break; }
        }
        if (targetY < animal.y) animal.vy -= 0.2;
        else if (targetY > animal.y) animal.vy += 0.2;
      }
      if (animal.vy > 1) animal.vy = 1;
      if (animal.vy < -1) animal.vy = -1;
    } else {
      animal.vy += GRAVITY;
    }
  } else if (
    (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) &&
    inTree && animal.state !== 'launching'
  ) {
    // Snakes climb trees vertically
    animal.vy = 0;
    if (targetX !== null) {
      let targetY = animal.y;
      if (animal.aggro) {
        targetY = state.player.y;
      } else {
        for (const other of state.animals) {
          if (Math.abs(other.x - targetX) < 4) { targetY = other.y; break; }
        }
      }
      if (targetY < animal.y - 10) animal.vy = -1;
      else if (targetY > animal.y + 10) animal.vy = 1;
    } else {
      if (Math.random() < 0.05) animal.vy = Math.random() > 0.5 ? 1 : -1;
    }
  } else {
    animal.vy += GRAVITY;
  }

  // --- Horizontal movement + collision ---
  if (
    (animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA ||
     animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) &&
    !inWater
  ) {
    animal.vx = 0; // Sea animals can't move horizontally out of water
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
      const isCat =
        animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR;
      if (isCat && targetX !== null && animal.vy === GRAVITY) {
        animal.vy = CAT_JUMP_VELOCITY; // Jump 5 blocks to clear obstacle while chasing
      } else {
        animal.facing *= -1;
        if (Math.random() < 0.5 && animal.vy === GRAVITY) {
          animal.vy = isCat ? CAT_JUMP_VELOCITY : -JUMP_FORCE * 0.8;
        }
      }
    }
  }

  // Track fall start for fall damage
  if (animal.vy > 0 && animal.fallStartY === undefined) {
    animal.fallStartY = animal.y;
  } else if (animal.vy < 0) {
    animal.fallStartY = undefined;
  }

  // --- Vertical movement + collision ---
  animal.y += animal.vy;
  if (checkCollision(animal, animal.type)) {
    if (animal.vy > 0) {
      animal.y = Math.floor((animal.y + animal.height) / TILE_SIZE) * TILE_SIZE - animal.height - 0.01;

      if (animal.fallStartY !== undefined) {
        const blocksFallen = (animal.y - animal.fallStartY) / TILE_SIZE;
        const isCat =
          animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR ||
          animal.type === AnimalType.BLACK_JAGUAR || animal.type === AnimalType.COCOA_CAT;
        const isBird = animal.type === AnimalType.BIRD;
        const isFish =
          animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA ||
          animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK;
        if (blocksFallen > 3 && !isCat && !isBird && !isFish) {
          animal.health -= Math.floor(blocksFallen - 3);
          animal.hurtTime = 10;
          playAnimalSfx(animal, 'normal');
        }
        animal.fallStartY = undefined;
      }

      if (animal.state === 'launching') {
        animal.state = 'idle';
        animal.stateTime = 30;
      }
    } else if (animal.vy < 0) {
      animal.y = Math.floor(animal.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
    }
    animal.vy = 0;
  }
};
