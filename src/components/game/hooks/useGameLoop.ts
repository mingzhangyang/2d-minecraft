import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { soundEngine } from '../../../utils/SoundEngine';
import { MAX_DURABILITY, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { AnimalType, BlockType } from '../types';
import type { FurnaceData } from '../types';
import { drawGame } from '../render/drawGame';
import type { GameState, Rect } from '../runtime';
import {
  isNonCollidingBlock,
  isTransparentBlock,
} from '../runtime';
import { updateGame } from '../update/updateGame';
import { handleInteract as _handleInteract } from '../update/playerInteractions';
import { saveGame, loadGame } from '../persistence';
import { disposeWorldStreaming } from '../world';

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
    let showDebug = false;
    let fpsFrameCount = 0;
    let lastFpsTime = performance.now();
    let currentFps = 0;
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
      if (e.code === 'Backquote') {
        showDebug = !showDebug;
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

    const interactSetters = {
      setFurnaceUI,
      setOpenFurnaceId,
      setIsInventoryOpen: (value: boolean) => setIsInventoryOpen(value),
    };
    const handleInteract = (button: number) =>
      _handleInteract(button, state, isIntersecting, interactSetters);


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

      // FPS tracking
      fpsFrameCount++;
      const now = performance.now();
      if (now - lastFpsTime >= 500) {
        currentFps = Math.round(fpsFrameCount * 1000 / (now - lastFpsTime));
        fpsFrameCount = 0;
        lastFpsTime = now;
      }

      // Debug overlay (toggle with ` key)
      if (showDebug) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(8, 8, 140, 48);
        ctx.fillStyle = '#00ff88';
        ctx.font = '13px monospace';
        ctx.fillText(`FPS: ${currentFps}`, 14, 26);
        ctx.fillText(`Entities: ${state.animals.length}  Items: ${state.droppedItems.length}`, 14, 46);
        ctx.restore();
      }

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
      disposeWorldStreaming(state.world);
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
