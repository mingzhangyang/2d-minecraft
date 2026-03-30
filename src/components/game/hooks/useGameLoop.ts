import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { soundEngine } from '../../../utils/SoundEngine';
import { MAX_DURABILITY, REACH, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { AnimalType, BlockType } from '../types';
import type { FurnaceData } from '../types';
import { drawGame } from '../render/drawGame';
import type { GameState, Rect } from '../runtime';
import {
  isCookedMeat,
  isNonCollidingBlock,
  isRawMeat,
  isReplaceableBlock,
  isTamingFood,
  isTransparentBlock,
} from '../runtime';
import { updateGame } from '../update/updateGame';
import { saveGame, loadGame } from '../persistence';

type SetState<T> = Dispatch<SetStateAction<T>>;
type GameStats = { health: number; hunger: number; daysPlayed: number };

type UseGameLoopParams = {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  gameState: MutableRefObject<GameState>;
  setShowControls: SetState<boolean>;
  setShowHotbar: SetState<boolean>;
  setIsInventoryOpen: SetState<boolean>;
  setFurnaceUI: SetState<FurnaceData | null>;
  setOpenFurnaceId: SetState<string | null>;
  setStats: SetState<GameStats>;
  setInventory: SetState<Record<number, number>>;
  setDurability: SetState<Record<number, number>>;
  setDiscoveredItems: SetState<Record<number, boolean>>;
  setIsDead: SetState<boolean>;
  setAutoRespawn: SetState<boolean>;
};

export const useGameLoop = ({
  canvasRef,
  gameState,
  setShowControls,
  setShowHotbar,
  setIsInventoryOpen,
  setFurnaceUI,
  setOpenFurnaceId,
  setStats,
  setInventory,
  setDurability,
  setDiscoveredItems,
  setIsDead,
  setAutoRespawn,
}: UseGameLoopParams) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;
    const state = gameState.current;

    // Try to load a saved game; fall back to spawn-point Y
    const loaded = loadGame(state);
    if (!loaded) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        const block = state.world[Math.floor(state.player.x / TILE_SIZE)][y];
        if (!isTransparentBlock(block)) {
          state.player.y = (y - 2) * TILE_SIZE;
          break;
        }
      }
    }

    // Auto-save every 30 seconds
    const autoSaveInterval = setInterval(() => saveGame(state), 30_000);

    // Save on page unload
    const handleBeforeUnload = () => saveGame(state);
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.init();
      if (e.repeat) return;
      state.keys[e.code] = true;
      if (e.key.toLowerCase() === 'd') {
        state.isDead = true;
      }
      if (e.key.toLowerCase() === 'r') {
        state.autoRespawn = !state.autoRespawn;
      }
      if (e.key.toLowerCase() === 'f') {
        state.player.isFlying = !state.player.isFlying;
        if (state.player.isFlying) {
          state.player.health = Math.max(1, state.player.health - 2);
        }

        if (state.selectedBlock === BlockType.DIRT) {
          state.player.inventory[BlockType.DIRT] = 0;
          state.invChanged = true;
          window.dispatchEvent(new CustomEvent('clearDirt'));
        }
      }
      if (e.key.toLowerCase() === 'c') {
        setShowControls(prev => !prev);
      }
      if (e.key.toLowerCase() === 'h') {
        setShowHotbar(prev => !prev);
      }
      if (e.code === 'KeyI' || e.code === 'KeyE' || e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'e') {
        setIsInventoryOpen(prev => {
          if (prev) {
            window.dispatchEvent(new CustomEvent('closeInventory'));
          }
          return !prev;
        });
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        setIsInventoryOpen(prev => {
          if (prev) {
            window.dispatchEvent(new CustomEvent('closeInventory'));
            return false;
          }
          return prev;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      state.keys[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = e.clientX - rect.left;
      state.mouse.y = e.clientY - rect.top;
    };

    const handleMouseDown = (e: MouseEvent) => {
      soundEngine.init();
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = e.clientX - rect.left;
      state.mouse.y = e.clientY - rect.top;

      const isRightClick = e.button === 2 || (e.button === 0 && e.shiftKey);
      const isLeftClick = e.button === 0 && !e.shiftKey;

      if (isLeftClick) state.mouse.leftDown = true;
      if (isRightClick) {
        state.mouse.rightDown = true;
        state.actionCooldown = 0;
      }

      handleInteract(isRightClick ? 2 : 0);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const isRightClick = e.button === 2 || (e.button === 0 && e.shiftKey);
      const isLeftClick = e.button === 0 && !e.shiftKey;

      if (isLeftClick) state.mouse.leftDown = false;
      if (isRightClick) state.mouse.rightDown = false;

      if (e.button === 0) {
        state.mouse.leftDown = false;
        state.mouse.rightDown = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    const checkCollision = (rect: { x: number; y: number; width: number; height: number }, animalType?: AnimalType) => {
      const startX = Math.floor(rect.x / TILE_SIZE);
      const endX = Math.floor((rect.x + rect.width) / TILE_SIZE);
      const startY = Math.floor(rect.y / TILE_SIZE);
      const endY = Math.floor((rect.y + rect.height) / TILE_SIZE);

      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
          if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            const block = state.world[x][y];
            if (!isNonCollidingBlock(block)) {
              if (animalType === AnimalType.TIGER_SNAKE && (block === BlockType.DIRT || block === BlockType.GRASS)) {
                continue;
              }
              return true;
            }
          } else {
            return true;
          }
        }
      }
      return false;
    };

    const isIntersecting = (r1: Rect, r2: Rect) => {
      return !(
        r2.x >= r1.x + r1.width ||
        r2.x + r2.width <= r1.x ||
        r2.y >= r1.y + r1.height ||
        r2.y + r2.height <= r1.y
      );
    };
    const handleInteract = (button: number) => {
      const worldX = state.mouse.x + state.camera.x;
      const worldY = state.mouse.y + state.camera.y;
      const gridX = Math.floor(worldX / TILE_SIZE);
      const gridY = Math.floor(worldY / TILE_SIZE);

      if (gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
        const playerCenterX = state.player.x + state.player.width / 2;
        const playerCenterY = state.player.y + state.player.height / 2;
        const dist = Math.sqrt(Math.pow(worldX - playerCenterX, 2) + Math.pow(worldY - playerCenterY, 2));

        const currentReach = state.selectedBlock === BlockType.FANG_LANCE ? REACH * 1.5 : REACH;

        if (dist <= currentReach) {
          if (button === 2) { // Right click: Place/Interact
            // Check if clicking an animal to tame
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
                    animal.aggro = false; // Stop attacking player
                    state.player.inventory[state.selectedBlock]--;
                    state.invChanged = true;
                    return; // Tamed, don't place block
                  }
                }
              }
            }

            // Check if clicking a furnace
            if (state.world[gridX][gridY] === BlockType.FURNACE) {
              const id = `${gridX},${gridY}`;
              if (!state.furnaces[id]) {
                state.furnaces[id] = { input: null, fuel: null, output: null, progress: 0, fuelLeft: 0, maxFuel: 0 };
              }
              setFurnaceUI(state.furnaces[id]);
              setOpenFurnaceId(id);
              setIsInventoryOpen(true);
              return;
            }

            if (state.selectedBlock === BlockType.APPLE) {
              if (state.player.hunger < state.player.maxHunger && state.player.inventory[BlockType.APPLE] > 0) {
                state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 3);
                state.player.inventory[BlockType.APPLE]--;
                state.invChanged = true;
                return; // Consumed, don't place
              }
            }
            if (state.selectedBlock === BlockType.WORM) {
              if (state.player.hunger < state.player.maxHunger && state.player.inventory[BlockType.WORM] > 0) {
                state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 1);
                state.player.inventory[BlockType.WORM]--;
                state.invChanged = true;
                return; // Consumed, don't place
              }
            }
            if (isRawMeat(state.selectedBlock)) {
              if (state.player.hunger < state.player.maxHunger && state.player.inventory[state.selectedBlock] > 0) {
                state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 4);
                state.player.health -= 2; // Raw meat damages you
                state.player.hurtTime = 10;
                state.player.inventory[state.selectedBlock]--;
                state.invChanged = true;
                return; // Consumed, don't place
              }
            }
            if (isCookedMeat(state.selectedBlock)) {
              if (state.player.hunger < state.player.maxHunger && state.player.inventory[state.selectedBlock] > 0) {
                state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 8);
                state.player.inventory[state.selectedBlock]--;
                state.invChanged = true;
                return; // Consumed, don't place
              }
            }
            if (isReplaceableBlock(state.world[gridX][gridY]) && state.player.inventory[state.selectedBlock] > 0) {
              const blockRect = { x: gridX * TILE_SIZE, y: gridY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
              if (!isIntersecting(state.player, blockRect)) {
                soundEngine.place();
                state.world[gridX][gridY] = state.selectedBlock;
                state.player.inventory[state.selectedBlock]--;
                state.invChanged = true;
              }
            }
          } else if (button === 0) { // Left click: Attack
            state.player.attackTimer = 15; // Set attack animation timer
            for (const animal of state.animals) {
              if (
                worldX >= animal.x && worldX <= animal.x + animal.width &&
                worldY >= animal.y && worldY <= animal.y + animal.height
              ) {
                if (animal.hurtTime <= 0) {
                  const hasItem = (state.player.inventory[state.selectedBlock] || 0) > 0;
                  let damage = 2;
                  if (hasItem) {
                    if (state.selectedBlock === BlockType.FANG) {
                      damage = 4;
                      animal.poisonTimer = 300; // 5 seconds of poison
                      animal.poisonTick = 60;
                    } else if (state.selectedBlock === BlockType.WOODEN_SWORD) {
                      damage = 5;
                    } else if (state.selectedBlock === BlockType.FANG_LANCE) {
                      damage = 7;
                      animal.poisonTimer = 300;
                      animal.poisonTick = 60;
                    } else if (state.selectedBlock === BlockType.WOODEN_PICKAXE) {
                      damage = 3;
                    } else if (state.selectedBlock === BlockType.STONE_PICKAXE) {
                      damage = 4;
                    } else if (state.selectedBlock === BlockType.IRON_PICKAXE) {
                      damage = 5;
                    } else if (state.selectedBlock === BlockType.GOLD_PICKAXE) {
                      damage = 3;
                    } else if (state.selectedBlock === BlockType.DIAMOND_PICKAXE) {
                      damage = 6;
                    }
                  }

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

                  if (animal.type === AnimalType.COCOA_CAT) {
                    const hasFullCocoaArmor = state.player.inventory[BlockType.COCOA_HELMET] > 0 &&
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
                    source: {
                      x: animal.x + animal.width / 2,
                      y: animal.y + animal.height / 2,
                    },
                    listener: {
                      x: playerCenterX,
                      y: playerCenterY,
                    },
                    maxDistance: 1400,
                  });
                  animal.hurtTime = 10;
                  animal.aggro = true;
                  animal.vy = -3; // Knockback up
                  animal.vx = (animal.x + animal.width / 2 > playerCenterX ? 1 : -1) * 3; // Knockback away
                  
                  // If we hit a snake, alert nearby snakes
                  if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) {
                    for (const other of state.animals) {
                      if (other !== animal && (other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE)) {
                        const distToOther = Math.hypot(other.x - animal.x, other.y - animal.y);
                        if (distToOther < 400) { // Alert radius
                          other.aggro = true;
                        }
                      }
                    }
                  }

                  // Stop mining if we hit an animal
                  state.mining.progress = 0;
                  return;
                }
              }
            }
          }
        }
      }
    };


    const update = () => {
      updateGame({
        canvas,
        state,
        setFurnaceUI,
        checkCollision,
        isIntersecting,
        handleInteract,
      });
    };

    const draw = () => {
      drawGame({ canvas, ctx, state });
    };
    const loop = () => {
      frameCount++;
      const isSlowMo = state.keys['KeyV'];
      
      // Update at full speed normally, or 1/4 speed if holding V
      if (!isSlowMo || frameCount % 4 === 0) {
        update();
      }
      
      draw();
      
      // Add a visual indicator for slow motion
      if (isSlowMo) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '20px monospace';
            ctx.fillText('SLOW MOTION', 20, 120);
          }
        }
      }
      
      if (state.tick % 5 === 0) {
        setStats(prev => {
          const daysPlayed = Math.floor(state.tick / 7200);
          if (prev.health !== state.player.health || prev.hunger !== state.player.hunger || prev.daysPlayed !== daysPlayed) {
            return { health: state.player.health, hunger: state.player.hunger, daysPlayed };
          }
          return prev;
        });
      }

      // Check for durability resets
      for (const [typeStr, count] of Object.entries(state.player.inventory)) {
        const type = parseInt(typeStr);
        if ((count as number) > 0 && state.player.durability[type] === 0 && MAX_DURABILITY[type]) {
          state.player.durability[type] = MAX_DURABILITY[type];
          state.invChanged = true;
        }
      }

      if (state.invChanged) {
        setInventory({ ...state.player.inventory });
        setDurability({ ...state.player.durability });
        setDiscoveredItems({ ...state.discoveredItems });
        state.invChanged = false;
      }

      if (state.isDead) {
        setIsDead(prev => prev ? prev : true);
      } else {
        setIsDead(prev => prev ? false : prev);
      }

      setAutoRespawn(prev => prev !== state.autoRespawn ? state.autoRespawn : prev);

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(autoSaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

};
