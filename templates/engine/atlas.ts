// High-Efficiency Canvas Texture Pool & Cache with LRU Invalidation.
// Eliminates texture upload stalls by caching rendered sprite drawings
// and avoiding redundant GPU texture re-uploads when character drawings do not change.
import * as THREE from "three";
import { Pen } from "../bridge/toon";

export interface TextureEntry {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  width: number;
  height: number;
  lastUsedFrame: number;
  key: string;
}

export class SmartTextureAtlas {
  private cache = new Map<string, TextureEntry>();
  private maxEntries: number;

  constructor(maxEntries = 128) {
    this.maxEntries = maxEntries;
  }

  /**
   * Retrieves or generates a cached texture for a given drawing key.
   *
   * @param key Unique visual hash key
   * @param width Canvas width in pixels
   * @param height Canvas height in pixels
   * @param scale Canvas transform scale
   * @param draw Drawing function
   * @param currentFrame Current animation frame number for LRU tracking
   */
  getTexture(
    key: string,
    width: number,
    height: number,
    scale: number,
    draw: (p: Pen) => void,
    currentFrame: number
  ): THREE.CanvasTexture {
    const fullKey = `${width}x${height}|${key}`;
    let entry = this.cache.get(fullKey);

    if (entry) {
      entry.lastUsedFrame = currentFrame;
      return entry.texture;
    }

    // Evict least recently used entries if pool is full
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU(currentFrame);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: false })!;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    draw(new Pen(ctx));

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    entry = {
      canvas,
      context: ctx,
      texture,
      width,
      height,
      lastUsedFrame: currentFrame,
      key: fullKey,
    };

    this.cache.set(fullKey, entry);
    return texture;
  }

  private evictLRU(currentFrame: number) {
    let oldestKey: string | null = null;
    let oldestFrame = Infinity;

    for (const [k, e] of this.cache.entries()) {
      if (e.lastUsedFrame < oldestFrame) {
        oldestFrame = e.lastUsedFrame;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        entry.texture.dispose();
        this.cache.delete(oldestKey);
      }
    }
  }

  dispose() {
    for (const entry of this.cache.values()) {
      entry.texture.dispose();
    }
    this.cache.clear();
  }
}
