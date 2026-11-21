import * as THREE from 'three';

/** Texturas canvas compartidas por los tres modelos (no se descartan). */
const cache = new Map<string, THREE.Texture>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  return t;
}

/** Listras del toldo, con el color de acento original del comercio. */
export function awningTexture(accent: string, repeatsX: number): THREE.Texture {
  const key = `awn|${accent}|${repeatsX}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, g] = makeCanvas(repeatsX * 32, 32);
  for (let i = 0; i < repeatsX * 2; i++) {
    g.fillStyle = i % 2 ? '#f6f1e6' : accent;
    g.fillRect(i * 16, 0, 16, 32);
  }
  const t = toTexture(c);
  cache.set(key, t);
  return t;
}

/** Letreiro comercial con el texto original del establishment. */
export function signTexture(text: string, accent: string): THREE.Texture {
  const key = `sign|${text}|${accent}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, g] = makeCanvas(512, 128);
  g.fillStyle = '#10181d';
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = accent;
  g.lineWidth = 6;
  g.strokeRect(5, 5, 502, 118);
  let size = 64;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const label = text.length > 28 ? text.slice(0, 27) + '…' : text;
  do {
    g.font = `700 ${size}px system-ui, "Segoe UI", Roboto, sans-serif`;
    size -= 4;
  } while (g.measureText(label).width > 460 && size > 18);
  g.fillStyle = '#ffffff';
  g.fillText(label, 256, 68);
  const t = toTexture(c);
  cache.set(key, t);
  return t;
}

/**
 * Halo del indicador de selección original: degradado blanco 0.75 → 0.
 * Reproduce `makeGlowTexture("rgba(255,255,255,0.75)", "rgba(255,255,255,0)")`
 * de `tumeremo-3d/src/three/textures.ts`, usado por `BusinessLayer`.
 */
export function selectionGlowTexture(): THREE.Texture {
  const hit = cache.get('selection-glow');
  if (hit) return hit;
  const [c, g] = makeCanvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 1;
  t.needsUpdate = true;
  cache.set('selection-glow', t);
  return t;
}

/** Gradial radial para la sombra de contacto de cada edificio. */
export function radialTexture(kind: 'shadow' | 'glow'): THREE.Texture {
  const hit = cache.get('radial-' + kind);
  if (hit) return hit;
  const [c, g] = makeCanvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  if (kind === 'shadow') {
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = toTexture(c);
  cache.set('radial-' + kind, t);
  return t;
}
