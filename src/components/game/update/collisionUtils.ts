import { isNonCollidingBlock, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { AnimalType, BlockType } from '../types';
import type { CollisionChecker, UpdateRect } from './updateContext';

type World = { [x: number]: { [y: number]: BlockType } };

/** A moveable rectangular body — the minimum interface needed by resolveX / resolveY. */
export type PhysicsBody = {
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
};

/**
 * Returns true if `rect` overlaps any solid block in `world`.
 *
 * Out-of-bounds tiles are treated as solid (colliding), so entities cannot
 * escape the world boundary.
 *
 * Tiger snakes pass through DIRT and GRASS tiles (burrowing behaviour).
 */
export const checkCollisionAgainstWorld = (
  rect: UpdateRect,
  world: World,
  animalType?: AnimalType,
): boolean => {
  const startX = Math.floor(rect.x / TILE_SIZE);
  const endX   = Math.floor((rect.x + rect.width)  / TILE_SIZE);
  const startY = Math.floor(rect.y / TILE_SIZE);
  const endY   = Math.floor((rect.y + rect.height) / TILE_SIZE);

  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
        const block = world[x][y];
        if (!isNonCollidingBlock(block)) {
          if (
            animalType === AnimalType.TIGER_SNAKE &&
            (block === BlockType.DIRT || block === BlockType.GRASS)
          ) {
            continue;
          }
          return true;
        }
      } else {
        return true; // out of world bounds → solid boundary
      }
    }
  }
  return false;
};

/**
 * Moves `body.x` by `body.vx`, then snaps it out of any wall it entered.
 * Returns true when a horizontal collision was resolved (body hit a wall).
 */
export const resolveX = (
  body: PhysicsBody,
  checkCollision: CollisionChecker,
  animalType?: AnimalType,
): boolean => {
  body.x += body.vx;
  if (!checkCollision(body, animalType)) return false;
  body.x = body.vx > 0
    ? Math.floor((body.x + body.width) / TILE_SIZE) * TILE_SIZE - body.width - 0.01
    : Math.floor(body.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
  body.vx = 0;
  return true;
};

/**
 * Moves `body.y` by `body.vy`, then snaps it out of any floor or ceiling it entered.
 *
 * Returns the value of `body.vy` **before** the move when a collision occurred,
 * or 0 when there was no collision. Callers use the sign to distinguish floor
 * hits (returned value > 0) from ceiling hits (returned value < 0).
 */
export const resolveY = (
  body: PhysicsBody,
  checkCollision: CollisionChecker,
  animalType?: AnimalType,
): number => {
  const prevVy = body.vy;
  body.y += body.vy;
  if (!checkCollision(body, animalType)) return 0;
  body.y = prevVy > 0
    ? Math.floor((body.y + body.height) / TILE_SIZE) * TILE_SIZE - body.height - 0.01
    : Math.floor(body.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
  body.vy = 0;
  return prevVy;
};
