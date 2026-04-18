import { soundEngine } from '../../../utils/SoundEngine';
import { BASE_ATTACK_DAMAGE, MAX_DURABILITY, POISON_WEAPONS, REACH, TILE_SIZE, WEAPON_DAMAGE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { AnimalType, BlockType } from '../types';
import type { FurnaceData } from '../types';
import type { GameState } from '../runtime';
import {
  isCookedMeat,
  isRawMeat,
  isReplaceableBlock,
  isTamingFood,
} from '../runtime';
import type { Intersector } from './updateContext';

export type InteractSetters = {
  setFurnaceUI: (data: FurnaceData | null) => void;
  setOpenFurnaceId: (id: string | null) => void;
  setIsInventoryOpen: (value: boolean) => void;
};

/**
 * Handles a mouse click on the game world.
 *
 * button === 0: left-click (attack / mine)
 * button === 2: right-click (place block / eat / tame / open furnace)
 *
 * Returns early without side-effects if the click is out of reach or out of world bounds.
 */
export const handleInteract = (
  button: number,
  state: GameState,
  isIntersecting: Intersector,
  setters: InteractSetters,
): void => {
  const { setFurnaceUI, setOpenFurnaceId, setIsInventoryOpen } = setters;
  const worldX = state.mouse.x + state.camera.x;
  const worldY = state.mouse.y + state.camera.y;
  const gridX = Math.floor(worldX / TILE_SIZE);
  const gridY = Math.floor(worldY / TILE_SIZE);

  if (gridX < 0 || gridX >= WORLD_WIDTH || gridY < 0 || gridY >= WORLD_HEIGHT) return;

  const playerCenterX = state.player.x + state.player.width / 2;
  const playerCenterY = state.player.y + state.player.height / 2;
  const currentReach = state.selectedBlock === BlockType.FANG_LANCE ? REACH * 1.5 : REACH;
  const distSq = (worldX - playerCenterX) ** 2 + (worldY - playerCenterY) ** 2;

  if (distSq > currentReach * currentReach) return;

  if (button === 2) { // Right click: place / interact
    // Tame an animal with food
    const isMeat = isTamingFood(state.selectedBlock);
    if (isMeat && state.player.inventory[state.selectedBlock] > 0) {
      for (const animal of state.animals) {
        if (
          worldX >= animal.x && worldX <= animal.x + animal.width &&
          worldY >= animal.y && worldY <= animal.y + animal.height
        ) {
          if (
            (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR) &&
            !animal.tamed
          ) {
            animal.tamed = true;
            animal.aggro = false;
            state.player.inventory[state.selectedBlock]--;
            state.invChanged = true;
            return;
          }
        }
      }
    }

    // Open furnace UI
    if (state.world[gridX][gridY] === BlockType.FURNACE) {
      const id = String(gridX * WORLD_HEIGHT + gridY);
      if (!state.furnaces[id]) {
        state.furnaces[id] = { input: null, fuel: null, output: null, progress: 0, fuelLeft: 0, maxFuel: 0 };
      }
      setFurnaceUI(state.furnaces[id]);
      setOpenFurnaceId(id);
      setIsInventoryOpen(true);
      return;
    }

    // Eat food
    if (state.selectedBlock === BlockType.APPLE) {
      if (state.player.hunger < state.player.maxHunger && state.player.inventory[BlockType.APPLE] > 0) {
        state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 3);
        state.player.inventory[BlockType.APPLE]--;
        state.invChanged = true;
        return;
      }
    }
    if (state.selectedBlock === BlockType.WORM) {
      if (state.player.hunger < state.player.maxHunger && state.player.inventory[BlockType.WORM] > 0) {
        state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 1);
        state.player.inventory[BlockType.WORM]--;
        state.invChanged = true;
        return;
      }
    }
    if (isRawMeat(state.selectedBlock)) {
      if (state.player.hunger < state.player.maxHunger && state.player.inventory[state.selectedBlock] > 0) {
        state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 4);
        state.player.health -= 2;
        state.player.hurtTime = 10;
        state.player.inventory[state.selectedBlock]--;
        state.invChanged = true;
        return;
      }
    }
    if (isCookedMeat(state.selectedBlock)) {
      if (state.player.hunger < state.player.maxHunger && state.player.inventory[state.selectedBlock] > 0) {
        state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 8);
        state.player.inventory[state.selectedBlock]--;
        state.invChanged = true;
        return;
      }
    }

    // Place block
    if (isReplaceableBlock(state.world[gridX][gridY]) && state.player.inventory[state.selectedBlock] > 0) {
      const blockRect = { x: gridX * TILE_SIZE, y: gridY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
      if (!isIntersecting(state.player, blockRect)) {
        soundEngine.place();
        state.world[gridX][gridY] = state.selectedBlock;
        state.player.inventory[state.selectedBlock]--;
        state.invChanged = true;
      }
    }

  } else if (button === 0) { // Left click: attack
    state.player.attackTimer = 15;
    for (const animal of state.animals) {
      if (
        worldX >= animal.x && worldX <= animal.x + animal.width &&
        worldY >= animal.y && worldY <= animal.y + animal.height
      ) {
        if (animal.hurtTime > 0) continue;

        const hasItem = (state.player.inventory[state.selectedBlock] || 0) > 0;
        let damage = BASE_ATTACK_DAMAGE;
        if (hasItem) {
          damage = WEAPON_DAMAGE[state.selectedBlock] ?? BASE_ATTACK_DAMAGE;
          if (POISON_WEAPONS.has(state.selectedBlock)) {
            animal.poisonTimer = 300;
            animal.poisonTick = 60;
          }
        }

        // Consume durability
        if (hasItem && MAX_DURABILITY[state.selectedBlock] !== undefined) {
          state.player.durability[state.selectedBlock]--;
          if (state.player.durability[state.selectedBlock] <= 0) {
            state.player.inventory[state.selectedBlock]--;
            state.player.durability[state.selectedBlock] = state.player.inventory[state.selectedBlock] > 0
              ? MAX_DURABILITY[state.selectedBlock]
              : 0;
          }
          state.invChanged = true;
        }

        // Cocoa Cat instant-kills the player unless wearing the full set
        if (animal.type === AnimalType.COCOA_CAT) {
          const hasFullCocoaArmor =
            state.player.inventory[BlockType.COCOA_HELMET] > 0 &&
            state.player.inventory[BlockType.COCOA_CHESTPLATE] > 0 &&
            state.player.inventory[BlockType.COCOA_LEGGINGS] > 0 &&
            state.player.inventory[BlockType.COCOA_BOOTS] > 0;
          if (!hasFullCocoaArmor || state.player.isFlying) {
            state.player.health = 0;
            if (hasItem && (
              state.selectedBlock === BlockType.WOODEN_SWORD ||
              state.selectedBlock === BlockType.FANG_LANCE ||
              state.selectedBlock === BlockType.WOODEN_PICKAXE ||
              state.selectedBlock === BlockType.STONE_PICKAXE ||
              state.selectedBlock === BlockType.IRON_PICKAXE ||
              state.selectedBlock === BlockType.GOLD_PICKAXE ||
              state.selectedBlock === BlockType.DIAMOND_PICKAXE
            )) {
              state.player.inventory[state.selectedBlock]--;
              if (state.player.inventory[state.selectedBlock] <= 0) {
                state.player.inventory[state.selectedBlock] = 0;
                state.player.durability[state.selectedBlock] = 0;
              }
              state.invChanged = true;
            }
          }
        }

        animal.health -= damage;
        soundEngine.animalSound(animal.type, {
          priority: 'normal',
          source: { x: animal.x + animal.width / 2, y: animal.y + animal.height / 2 },
          listener: { x: playerCenterX, y: playerCenterY },
          maxDistance: 1400,
        });
        animal.hurtTime = 10;
        animal.aggro = true;
        animal.vy = -3;
        animal.vx = (animal.x + animal.width / 2 > playerCenterX ? 1 : -1) * 3;

        // Alert nearby snakes when one is hit
        if (
          animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE
        ) {
          for (const other of state.animals) {
            if (
              other !== animal &&
              (other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) &&
              Math.hypot(other.x - animal.x, other.y - animal.y) < 400
            ) {
              other.aggro = true;
            }
          }
        }

        state.mining.progress = 0;
        return;
      }
    }
  }
};
