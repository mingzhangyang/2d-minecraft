import React, { useEffect, useRef, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { MAX_DURABILITY } from './game/constants';
import { BlockType, FurnaceData } from './game/types';
import { createEmptyInventory } from './game/state';
import { GameOverlay } from './game/ui/GameOverlay';
import type { GameState, HoveredSlot, InventoryStack } from './game/runtime';
import { createInitialGameState, respawnPlayer } from './game/runtime';
import { useGameLoop } from './game/hooks/useGameLoop';
import { useLandscapeMode } from './game/hooks/useLandscapeMode';
import { usePortraitDialogFocus } from './game/hooks/usePortraitDialogFocus';
import { useInventoryInteractions } from './game/hooks/useInventoryInteractions';
import { deleteSave } from './game/persistence';
import { initAnalytics, track } from '../utils/analytics';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { needsLandscape, canRequestLandscape, requestLandscape, isRequesting, requestFailed } =
    useLandscapeMode(containerRef);
  const { onDialogKeyDown } = usePortraitDialogFocus(needsLandscape, dialogRef, canvasRef);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(BlockType.DIRT);
  const [stats, setStats] = useState({ health: 10, hunger: 10, daysPlayed: 0 });
  const [inventory, setInventory] = useState<Record<number, number>>(createEmptyInventory());
  const [durability, setDurability] = useState<Record<number, number>>({ ...MAX_DURABILITY });
  const [discoveredItems, setDiscoveredItems] = useState<Record<number, boolean>>({});
  const [isDead, setIsDead] = useState(false);
  const [autoRespawn, setAutoRespawn] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHotbar, setShowHotbar] = useState(true);
  const [openFurnaceId, setOpenFurnaceId] = useState<string | null>(null);
  const [furnaceUI, setFurnaceUI] = useState<FurnaceData | null>(null);
  const [craftingGrid, setCraftingGrid] = useState<(InventoryStack | null)[]>(Array(9).fill(null));
  const [cursorItem, setCursorItem] = useState<InventoryStack | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoveredSlotRef = useRef<HoveredSlot | null>(null);
  const gameStateRef = useRef<GameState | null>(null);

  if (gameStateRef.current === null) {
    gameStateRef.current = createInitialGameState();
  }

  const gameState = gameStateRef as React.MutableRefObject<GameState>;

  useGameLoop({
    canvasRef,
    gameState,
    isPaused: needsLandscape,
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
  });

  // The shared client reads the latest React state; open/active sampling belongs
  // solely to the shared client. Crafting and inventory are still sandbox play.
  const playingRef = useRef(!isDead);
  playingRef.current = !isDead && !needsLandscape;
  useEffect(() => { initAnalytics(() => playingRef.current); }, []);

  // Play stats. A sandbox has no natural "run", so a life is the unit: the
  // session start, every respawn and every new world count as 'play', and
  // each death counts as 'finish'.
  const wasDeadRef = useRef(false);
  useEffect(() => {
    track('play');
  }, []);
  useEffect(() => {
    if (isDead) track('finish');
    else if (wasDeadRef.current) track('play');
    wasDeadRef.current = isDead;
  }, [isDead]);

  // Sync selected block to game state ref
  useEffect(() => {
    if (cursorItem && MAX_DURABILITY[cursorItem.type] && gameState.current.player.durability[cursorItem.type] === 0) {
      gameState.current.player.durability[cursorItem.type] = MAX_DURABILITY[cursorItem.type];
      gameState.current.invChanged = true;
    }
  }, [cursorItem]);

  useEffect(() => {
    gameState.current.selectedBlock = selectedBlock;
  }, [selectedBlock]);

  useEffect(() => {
    const handleClearDirt = () => {
      if (selectedBlock === BlockType.DIRT) {
        setSelectedBlock(BlockType.AIR);
      }
    };
    window.addEventListener('clearDirt', handleClearDirt);
    return () => window.removeEventListener('clearDirt', handleClearDirt);
  }, [selectedBlock]);

  useEffect(() => {
    const handleClose = () => {
      setOpenFurnaceId(null);
      setFurnaceUI(null);
      setInventory(prev => {
        const newInv = { ...prev };
        setCursorItem(cursor => {
          if (cursor) newInv[cursor.type] = (newInv[cursor.type] || 0) + cursor.count;
          return null;
        });
        setCraftingGrid(grid => {
          grid.forEach(slot => {
            if (slot) newInv[slot.type] = (newInv[slot.type] || 0) + slot.count;
          });
          return Array(9).fill(null);
        });
        gameState.current.player.inventory = { ...newInv };
        return newInv;
      });
    };
    
    const handleForceClose = () => {
      setIsInventoryOpen(false);
      handleClose();
    };

    window.addEventListener('closeInventory', handleClose as EventListener);
    window.addEventListener('forceCloseInventory', handleForceClose as EventListener);
    return () => {
      window.removeEventListener('closeInventory', handleClose as EventListener);
      window.removeEventListener('forceCloseInventory', handleForceClose as EventListener);
    };
  }, []);

  useEffect(() => {
    gameState.current.isInventoryOpen = isInventoryOpen;
  }, [isInventoryOpen]);

  useEffect(() => {
    gameState.current.openFurnaceId = openFurnaceId;
  }, [openFurnaceId]);

  // Size the drawing buffer to the canvas's actual layout box, including
  // full-screen transitions, browser chrome changes, and device rotation.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
    };

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleResize);
    observer?.observe(canvas);
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    handleResize();

    // Focus the canvas so keyboard events work immediately.
    if (!needsLandscape) canvas.focus();

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, []);

  const {
    craftingResult,
    handleInventoryClick,
    handleCraftingGridClick,
    handleFurnaceClick,
    handleCraftingResultClick,
  } = useInventoryInteractions({
    gameState,
    openFurnaceId,
    isInventoryOpen,
    inventory,
    craftingGrid,
    cursorItem,
    hoveredSlotRef,
    setInventory,
    setCraftingGrid,
    setCursorItem,
    setFurnaceUI,
    setDiscoveredItems,
  });

  const handleHoveredSlotChange = (slot: HoveredSlot | null) => {
    hoveredSlotRef.current = slot;
  };

  const handleInventoryMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleRespawn = () => {
    const state = gameState.current;
    respawnPlayer(state);
    setIsDead(false);
    setStats({
      health: state.player.health,
      hunger: state.player.hunger,
      daysPlayed: Math.floor(state.tick / 7200),
    });
  };

  const handleNewGame = () => {
    // From the death screen the isDead -> false transition already counts it.
    if (!isDead) track('play');
    deleteSave();
    // Reinitialize game state in place
    const state = gameState.current;
    const fresh = createInitialGameState();
    Object.assign(state, fresh);
    setIsDead(false);
    setInventory({ ...fresh.player.inventory });
    setDurability({ ...fresh.player.durability });
    setDiscoveredItems({ ...fresh.discoveredItems });
    setSelectedBlock(fresh.selectedBlock);
    setStats({
      health: fresh.player.health,
      hunger: fresh.player.hunger,
      daysPlayed: 0,
    });

    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className="game-screen relative w-full overflow-hidden bg-black">
      <div className="absolute inset-0" inert={needsLandscape} aria-hidden={needsLandscape}>
        <canvas
        ref={canvasRef}
        className="game-canvas block w-full h-full cursor-crosshair focus:outline-none"
        style={{ imageRendering: 'pixelated' }}
        tabIndex={0}
      />

      <GameOverlay
        isDead={isDead}
        isInventoryOpen={isInventoryOpen}
        showHotbar={showHotbar}
        showControls={showControls}
        autoRespawn={autoRespawn}
        openFurnaceId={openFurnaceId}
        furnaceUI={furnaceUI}
        craftingGrid={craftingGrid}
        craftingResult={craftingResult}
        cursorItem={cursorItem}
        mousePos={mousePos}
        stats={stats}
        inventory={inventory}
        durability={durability}
        discoveredItems={discoveredItems}
        selectedBlock={selectedBlock}
        onRespawn={handleRespawn}
        onNewGame={handleNewGame}
        onInventoryMouseMove={handleInventoryMouseMove}
        onInventorySlotMouseDown={handleInventoryClick}
        onCraftingGridMouseDown={handleCraftingGridClick}
        onFurnaceMouseDown={handleFurnaceClick}
        onCraftingResultMouseDown={handleCraftingResultClick}
        onSelectBlock={setSelectedBlock}
        onHoveredSlotChange={handleHoveredSlotChange}
      />
      </div>

      {needsLandscape && (
        <div
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
          onKeyDown={onDialogKeyDown}
          aria-modal="true"
          aria-labelledby="landscape-title"
          className="absolute inset-0 z-[70] flex items-center justify-center bg-[#0b1714]/95 px-6 text-white"
        >
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <Smartphone aria-hidden="true" className="h-14 w-14 rotate-90 text-emerald-300" strokeWidth={1.5} />
            <h1 id="landscape-title" className="text-2xl font-bold">Play in landscape</h1>
            <p className="text-sm leading-relaxed text-white/80">
              This game needs a wider screen. Turn your device sideways to continue.
            </p>
            {canRequestLandscape && (
              <button
                type="button"
                onClick={requestLandscape}
                disabled={isRequesting}
                className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                {isRequesting ? 'Switching…' : 'Try landscape fullscreen'}
              </button>
            )}
            {(requestFailed || !canRequestLandscape) && (
              <p role="status" className="text-xs leading-relaxed text-white/60">
                Your browser cannot rotate the screen automatically. Rotate your device manually
                and check that orientation lock is turned off.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
