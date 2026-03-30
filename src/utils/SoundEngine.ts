const MAX_CONCURRENT_SOUNDS = 10;

type SoundPriority = 'ambient' | 'normal' | 'player';
type Point2D = { x: number; y: number };
type SoundOptions = {
  priority?: SoundPriority;
  source?: Point2D;
  listener?: Point2D;
  maxDistance?: number;
  volumeScale?: number;
};

type ActiveSource = {
  node: AudioScheduledSourceNode;
  priority: number;
  startedAt: number;
  cleanupTimer: number;
};

const PRIORITY: Record<SoundPriority, number> = {
  ambient: 0,
  normal: 1,
  player: 2,
};

export class SoundEngine {
  ctx: AudioContext | null = null;
  private activeSources: ActiveSource[] = [];

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private removeSource(source: ActiveSource) {
    const idx = this.activeSources.indexOf(source);
    if (idx !== -1) {
      this.activeSources.splice(idx, 1);
    }
    window.clearTimeout(source.cleanupTimer);
    source.node.onended = null;
    try {
      source.node.disconnect();
    } catch {
      // no-op if already disconnected
    }
  }

  private reserveSlot(priority: number): boolean {
    if (!this.ctx) return false;

    if (this.activeSources.length < MAX_CONCURRENT_SOUNDS) {
      return true;
    }

    // Preempt the oldest lower-priority source, if any.
    let victimIndex = -1;
    for (let i = 0; i < this.activeSources.length; i++) {
      const candidate = this.activeSources[i];
      if (candidate.priority >= priority) continue;
      if (victimIndex === -1) {
        victimIndex = i;
        continue;
      }
      const victim = this.activeSources[victimIndex];
      if (
        candidate.priority < victim.priority ||
        (candidate.priority === victim.priority && candidate.startedAt < victim.startedAt)
      ) {
        victimIndex = i;
      }
    }

    if (victimIndex === -1) return false;
    const victim = this.activeSources[victimIndex];
    try {
      victim.node.stop();
    } catch {
      this.removeSource(victim);
    }
    return true;
  }

  private trackNode(node: AudioScheduledSourceNode, durationMs: number, priority: number) {
    const source: ActiveSource = {
      node,
      priority,
      startedAt: performance.now(),
      cleanupTimer: 0,
    };
    const cleanup = () => this.removeSource(source);
    node.onended = cleanup;
    source.cleanupTimer = window.setTimeout(cleanup, durationMs + 150);
    this.activeSources.push(source);
  }

  private getEffectiveVolume(base: number, options?: SoundOptions): number {
    const volumeScale = options?.volumeScale ?? 1;
    const nominal = base * volumeScale;
    if (!options?.source || !options.listener) return nominal;

    const maxDistance = options.maxDistance ?? 1200;
    const dx = options.source.x - options.listener.x;
    const dy = options.source.y - options.listener.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= maxDistance) return 0;

    const t = 1 - distance / maxDistance;
    return nominal * t * t;
  }

  playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    vol: number = 0.1,
    options: SoundOptions = {},
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const effectiveVol = this.getEffectiveVolume(vol, options);
    if (effectiveVol <= 0.001) return;
    const priority = PRIORITY[options.priority ?? 'normal'];
    if (!this.reserveSlot(priority)) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(effectiveVol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
    this.trackNode(osc, duration * 1000, priority);
  }

  // Pre-allocated noise buffer pool
  private noiseBuffer: AudioBuffer | null = null;
  private getNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx;
    if (!ctx) {
      throw new Error('Audio context not initialized');
    }
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.5); // 0.5s buffer, reused for all noise
      this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuffer;
  }

  playNoise(duration: number, vol: number = 0.1, options: SoundOptions = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const effectiveVol = this.getEffectiveVolume(vol, options);
    if (effectiveVol <= 0.001) return;
    const priority = PRIORITY[options.priority ?? 'normal'];
    if (!this.reserveSlot(priority)) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(effectiveVol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + duration);
    this.trackNode(noise, duration * 1000, priority);
  }

  jump() {
    const priority = PRIORITY.player;
    if (!this.reserveSlot(priority)) return;
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    this.trackNode(osc, 250, priority);
  }

  mine() {
    this.playNoise(0.1, 0.2, { priority: 'player' });
  }

  place() {
    this.playTone(150, 'triangle', 0.1, 0.2, { priority: 'player' });
  }

  pickup() {
    const priority = PRIORITY.player;
    if (!this.reserveSlot(priority)) return;
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
    this.trackNode(osc, 100, priority);
  }

  damage() {
    const priority = PRIORITY.player;
    if (!this.reserveSlot(priority)) return;
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    this.trackNode(osc, 350, priority);
  }

  animalSound(type: string, options: SoundOptions = {}) {
    const withDefaults: SoundOptions = {
      priority: 'ambient',
      maxDistance: 1200,
      ...options,
    };
    if (type === 'PIG') this.playTone(150, 'square', 0.2, 0.05, withDefaults);
    else if (type === 'COW') this.playTone(100, 'sawtooth', 0.5, 0.05, withDefaults);
    else if (type === 'CHICKEN') this.playTone(600, 'square', 0.1, 0.05, withDefaults);
    else if (type === 'SNAKE' || type === 'STRIPED_SNAKE' || type === 'TIGER_SNAKE') this.playNoise(0.3, 0.05, withDefaults);
    else if (type === 'BIRD') this.playTone(1200, 'sine', 0.1, 0.05, withDefaults);
    else if (type === 'FISH' || type === 'ORCA' || type === 'DOLPHIN' || type === 'SHARK') this.playNoise(0.2, 0.05, withDefaults);
  }
}

export const soundEngine = new SoundEngine();
