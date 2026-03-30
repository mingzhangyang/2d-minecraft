import type { MouseEvent } from 'react';
import { Drumstick, Heart } from 'lucide-react';
import { INVENTORY_BLOCKS, MAX_DURABILITY } from '../constants';
import { BlockIcon } from '../render/rendering';
import { BlockType, FurnaceData } from '../types';
import type { FurnaceSlotType, HoveredSlot, InventoryStack } from '../runtime';

type GameStats = {
  health: number;
  hunger: number;
  daysPlayed: number;
};

type GameOverlayProps = {
  isDead: boolean;
  onNewGame?: () => void;
  isInventoryOpen: boolean;
  showHotbar: boolean;
  showControls: boolean;
  autoRespawn: boolean;
  openFurnaceId: string | null;
  furnaceUI: FurnaceData | null;
  craftingGrid: (InventoryStack | null)[];
  craftingResult: InventoryStack | null;
  cursorItem: InventoryStack | null;
  mousePos: { x: number; y: number };
  stats: GameStats;
  inventory: Record<number, number>;
  durability: Record<number, number>;
  discoveredItems: Record<number, boolean>;
  selectedBlock: BlockType;
  onRespawn: () => void;
  onInventoryMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  onInventorySlotMouseDown: (event: MouseEvent<HTMLDivElement>, block: BlockType) => void;
  onCraftingGridMouseDown: (event: MouseEvent<HTMLDivElement>, index: number) => void;
  onFurnaceMouseDown: (event: MouseEvent<HTMLDivElement>, slotType: FurnaceSlotType) => void;
  onCraftingResultMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  onSelectBlock: (block: BlockType) => void;
  onHoveredSlotChange: (slot: HoveredSlot | null) => void;
};

const slotClassName =
  'bg-[#8B8B8B] border-4 border-t-[#373737] border-l-[#373737] border-b-white border-r-white relative hover:bg-[#9B9B9B] cursor-pointer';

const getDurabilityColor = (value: number, max: number) => {
  const ratio = value / max;
  if (ratio > 0.5) return 'bg-green-500';
  if (ratio > 0.2) return 'bg-yellow-500';
  return 'bg-red-500';
};

type DurabilityBarProps = {
  current: number;
  max: number;
  className: string;
};

function DurabilityBar({ current, max, className }: DurabilityBarProps) {
  return (
    <div className={className}>
      <div
        className={`h-full ${getDurabilityColor(current, max)}`}
        style={{ width: `${(current / max) * 100}%` }}
      />
    </div>
  );
}

type StackDisplayProps = {
  type: BlockType;
  count: number;
  durability?: number;
  large?: boolean;
};

function StackDisplay({ type, count, durability, large = false }: StackDisplayProps) {
  const maxDurability = MAX_DURABILITY[type];

  return (
    <>
      <BlockIcon type={type} className={large ? 'absolute inset-3' : undefined} />
      <span
        className={`absolute ${
          large ? 'bottom-1 right-2 text-lg' : maxDurability ? 'bottom-1.5 right-1 text-sm' : 'bottom-0 right-1 text-sm'
        } text-white font-bold drop-shadow-md z-10`}
      >
        {count}
      </span>
      {maxDurability && durability !== undefined && (
        <DurabilityBar
          current={durability}
          max={maxDurability}
          className={large ? 'absolute bottom-0 left-1 right-1 h-1 bg-black/50 z-20' : 'absolute bottom-0 left-1 right-1 h-1 bg-black/50 z-20'}
        />
      )}
    </>
  );
}

export function GameOverlay({
  isDead,
  isInventoryOpen,
  showHotbar,
  showControls,
  autoRespawn,
  openFurnaceId,
  furnaceUI,
  craftingGrid,
  craftingResult,
  cursorItem,
  mousePos,
  stats,
  inventory,
  durability,
  discoveredItems,
  selectedBlock,
  onRespawn,
  onNewGame,
  onInventoryMouseMove,
  onInventorySlotMouseDown,
  onCraftingGridMouseDown,
  onFurnaceMouseDown,
  onCraftingResultMouseDown,
  onSelectBlock,
  onHoveredSlotChange,
}: GameOverlayProps) {
  return (
    <>
      {isDead && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-sm">
          <h1 className="mb-8 text-6xl font-bold text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">You Died!</h1>
          <div className="flex gap-4">
            <button
              onClick={onRespawn}
              className="rounded-lg bg-white px-8 py-4 text-2xl font-bold text-red-900 shadow-lg transition-colors hover:bg-gray-200"
            >
              Respawn
            </button>
            {onNewGame && (
              <button
                onClick={onNewGame}
                className="rounded-lg bg-gray-700 px-8 py-4 text-2xl font-bold text-white shadow-lg transition-colors hover:bg-gray-600"
              >
                New Game
              </button>
            )}
          </div>
        </div>
      )}

      {isInventoryOpen && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onContextMenu={event => event.preventDefault()}
          onMouseMove={onInventoryMouseMove}
        >
          <div className="flex gap-12 rounded-lg border-4 border-[#555] bg-[#C6C6C6] p-6 shadow-2xl">
            <div>
              <h2 className="mb-2 text-xl font-bold text-[#373737]">Inventory</h2>
              <div className="grid grid-cols-4 gap-2">
                {INVENTORY_BLOCKS.map(block => (
                  <div
                    key={block}
                    className={`${slotClassName} h-16 w-16`}
                    onMouseDown={event => (discoveredItems[block] ? onInventorySlotMouseDown(event, block) : undefined)}
                    onContextMenu={event => event.preventDefault()}
                    onMouseEnter={() => onHoveredSlotChange({ type: 'inventory', block })}
                    onMouseLeave={() => onHoveredSlotChange(null)}
                  >
                    {discoveredItems[block] && (
                      <StackDisplay
                        type={block}
                        count={inventory[block] || 0}
                        durability={inventory[block] > 0 ? durability[block] : undefined}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {openFurnaceId && furnaceUI ? (
              <div>
                <h2 className="mb-2 text-xl font-bold text-[#373737]">Furnace</h2>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col gap-4">
                    <div
                      className={`${slotClassName} h-16 w-16`}
                      onMouseDown={event => onFurnaceMouseDown(event, 'input')}
                      onContextMenu={event => event.preventDefault()}
                    >
                      {furnaceUI.input && <StackDisplay type={furnaceUI.input.type} count={furnaceUI.input.count} />}
                    </div>

                    <div className="relative flex h-8 w-16 items-center justify-center">
                      <div className="mask-fire h-8 w-8 bg-[#373737] opacity-20" />
                      {furnaceUI.maxFuel > 0 && (
                        <div
                          className="mask-fire absolute bottom-0 w-8 bg-orange-500"
                          style={{ height: `${(furnaceUI.fuelLeft / furnaceUI.maxFuel) * 32}px` }}
                        />
                      )}
                    </div>

                    <div
                      className={`${slotClassName} h-16 w-16`}
                      onMouseDown={event => onFurnaceMouseDown(event, 'fuel')}
                      onContextMenu={event => event.preventDefault()}
                    >
                      {furnaceUI.fuel && <StackDisplay type={furnaceUI.fuel.type} count={furnaceUI.fuel.count} />}
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative h-4 w-12 overflow-hidden bg-[#373737]">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-white"
                        style={{ width: `${(furnaceUI.progress / 600) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 text-4xl font-bold text-[#373737]">➔</div>
                  </div>

                  <div
                    className={`${slotClassName} h-20 w-20`}
                    onMouseDown={event => onFurnaceMouseDown(event, 'output')}
                    onContextMenu={event => event.preventDefault()}
                  >
                    {furnaceUI.output && <StackDisplay type={furnaceUI.output.type} count={furnaceUI.output.count} large />}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="mb-2 text-xl font-bold text-[#373737]">Crafting</h2>
                <div className="flex items-center gap-6">
                  <div className="grid grid-cols-3 gap-2">
                    {craftingGrid.map((slot, index) => (
                      <div
                        key={index}
                        className={`${slotClassName} h-16 w-16`}
                        onMouseDown={event => onCraftingGridMouseDown(event, index)}
                        onContextMenu={event => event.preventDefault()}
                        onMouseEnter={() => onHoveredSlotChange({ type: 'crafting', index })}
                        onMouseLeave={() => onHoveredSlotChange(null)}
                      >
                        {slot && <StackDisplay type={slot.type} count={slot.count} />}
                      </div>
                    ))}
                  </div>

                  <div className="text-4xl font-bold text-[#373737]">➔</div>

                  <div
                    className={`${slotClassName} h-20 w-20`}
                    onMouseDown={onCraftingResultMouseDown}
                    onContextMenu={event => event.preventDefault()}
                  >
                    {craftingResult && <StackDisplay type={craftingResult.type} count={craftingResult.count} large />}
                  </div>
                </div>
              </div>
            )}
          </div>

          {cursorItem && (
            <div
              className="fixed z-50 h-12 w-12 pointer-events-none"
              style={{ left: mousePos.x - 24, top: mousePos.y - 24 }}
            >
              <StackDisplay
                type={cursorItem.type}
                count={cursorItem.count}
                durability={durability[cursorItem.type]}
              />
            </div>
          )}
        </div>
      )}

      {showHotbar && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-xl bg-black/50 p-1.5 backdrop-blur-sm">
          {INVENTORY_BLOCKS.map(block =>
            discoveredItems[block] ? (
              <button
                key={block}
                onClick={() => onSelectBlock(block)}
                className={`relative h-8 w-8 overflow-hidden rounded-md border-2 transition-all ${
                  selectedBlock === block
                    ? 'scale-110 border-white shadow-lg'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                title={BlockType[block]}
              >
                <BlockIcon type={block} className="absolute inset-0" />
                <span
                  className={`absolute ${
                    MAX_DURABILITY[block] ? 'bottom-1 right-0.5' : 'bottom-0 right-0.5'
                  } z-10 text-[10px] font-bold text-white drop-shadow-md`}
                >
                  {inventory[block] || 0}
                </span>
                {MAX_DURABILITY[block] && inventory[block] > 0 && (
                  <DurabilityBar
                    current={durability[block]}
                    max={MAX_DURABILITY[block]}
                    className="absolute bottom-0 left-0.5 right-0.5 z-20 h-1 bg-black/50"
                  />
                )}
              </button>
            ) : (
              <div key={block} className="h-8 w-8 rounded-md border-2 border-transparent bg-black/30 opacity-30" />
            ),
          )}
        </div>
      )}

      {showControls && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-black/50 p-3 font-mono text-sm text-white/80 backdrop-blur-sm">
          <p className="mb-1 font-bold text-white">Controls</p>
          <p>WASD / Arrows : Move</p>
          <p>Space / Up : Jump</p>
          <p>Left Click  : Break Block</p>
          <p>Right/Shift+Click : Place Block / Eat Food</p>
          <p>I / E / Esc : Open/Close Inventory</p>
          <p>S : Split Item (Hover in Inv/Crafting)</p>
          <p>D : Kill Player (Dev)</p>
          <p>R : Toggle Auto-Respawn</p>
          <p>F : Toggle Flight</p>
          <p>C : Toggle Controls</p>
          <p>H : Toggle Hotbar</p>
          <p className="mt-2 font-bold text-yellow-300">Days Played: {stats.daysPlayed}</p>
          {autoRespawn && <p className="font-bold text-green-400">Auto-Respawn: ON</p>}
        </div>
      )}

      <div className="pointer-events-none absolute right-4 top-4 flex flex-col gap-2">
        <div className="flex justify-end gap-1">
          {Array.from({ length: 10 }).map((_, index) => (
            <Heart
              key={`hp-${index}`}
              size={24}
              className={index < stats.health ? 'fill-red-500 text-red-600' : 'fill-black/50 text-black/80'}
            />
          ))}
        </div>
        <div className="flex justify-end gap-1">
          {Array.from({ length: 10 }).map((_, index) => (
            <Drumstick
              key={`hg-${index}`}
              size={24}
              className={index < stats.hunger ? 'fill-amber-700 text-amber-800' : 'fill-black/50 text-black/80'}
            />
          ))}
        </div>
      </div>
    </>
  );
}
