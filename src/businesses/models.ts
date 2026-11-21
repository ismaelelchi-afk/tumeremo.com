import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { awningTexture, radialTexture, signTexture } from './modelTextures';
import type { BusinessRecipe } from './data';

/**
 * Recetas procedurales `colonial`, `tecno` y `boutique`, adaptadas de
 * `tumeremo-3d` por `tumeremo-plan/src/engine/models/procedural.ts`.
 * Convención local: Y arriba, fachada en +Z, unidades en metros.
 * El motor gira el grupo para el sistema Z-arriba de MapLibre.
 */
export interface ModelParams {
  width: number;
  depth: number;
  height: number;
  wallColor: string;
  roofColor: string;
  accentColor: string;
}

export interface BuildOpts {
  label: string;
  seed: number;
}

type Mat = THREE.Material;

const shade = (c: string, f: number) => '#' + new THREE.Color(c).multiplyScalar(f).getHexString();

function lam(color: string, extra: THREE.MeshLambertMaterialParameters = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

/** Materiales estructurales del edificio; conservan su color base sin realce. */
function tintable(color: string, extra: THREE.MeshLambertMaterialParameters = {}) {
  const m = lam(color, extra);
  m.userData.base = new THREE.Color(color);
  m.userData.tintable = true;
  return m;
}

/** Vidrios: conservan el resplandor cálido por tema, sin refuerzo al seleccionar. */
function glass(color: string, extra: THREE.MeshLambertMaterialParameters = {}) {
  const m = lam(color, extra);
  m.userData.base = new THREE.Color(color);
  m.userData.glass = true;
  return m;
}

function glowBasic(color: string, extra: THREE.MeshBasicMaterialParameters = {}) {
  const m = new THREE.MeshBasicMaterial({ color, ...extra });
  m.userData.glowBasic = new THREE.Color(color);
  return m;
}

function mesh(g: THREE.BufferGeometry, m: Mat | Mat[]) {
  const o = new THREE.Mesh(g, m);
  o.frustumCulled = false;
  return o;
}

/** Caja con base en y (centro en x,z). */
function box(w: number, h: number, d: number, m: Mat | Mat[], x = 0, y = 0, z = 0) {
  const o = mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y + h / 2, z);
  return o;
}

function cyl(rt: number, rb: number, h: number, m: Mat, x = 0, y = 0, z = 0, seg = 10) {
  const o = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  o.position.set(x, y + h / 2, z);
  return o;
}

/** Caja centrada en x/y/z. */
function panel(w: number, h: number, d: number, m: Mat, x = 0, y = 0, z = 0) {
  const o = mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  return o;
}

/** Cubierta de cuatro águas de las fachadas coloniales. */
function hipRoof(w: number, d: number, rise: number, over: number, roofMat: Mat, trimMat: Mat) {
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, true);
  geo.rotateY(Math.PI / 4);
  const roof = mesh(geo, roofMat);
  roof.scale.set(w + over * 2, rise, d + over * 2);
  roof.position.y = rise / 2;
  g.add(roof);
  g.add(box(w + over * 2, 0.1, d + over * 2, trimMat, 0, -0.08, 0));
  return g;
}

function awning(w: number, len: number, accent: string, y: number, zFront: number) {
  const a = 0.42;
  const rep = Math.max(2, Math.round(w / 0.9));
  const stripes = tintable('#ffffff', { map: awningTexture(accent, rep) });
  const plain = tintable(shade(accent, 0.7));
  const o = mesh(new THREE.BoxGeometry(w, 0.07, len), [plain, plain, stripes, stripes, plain, plain]);
  o.position.set(0, y - (len * Math.sin(a)) / 2, zFront + (len * Math.cos(a)) / 2);
  o.rotation.x = a;
  return o;
}

function signBoard(text: string, accent: string, w: number, h: number, x: number, y: number, z: number) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ map: signTexture(text, accent) });
  m.userData.glowBasic = new THREE.Color('#ffffff');
  const plane = mesh(new THREE.PlaneGeometry(w, h), m);
  plane.position.set(x, y, z + 0.03);
  g.add(plane);
  g.add(box(w + 0.12, h + 0.12, 0.06, lam('#10181d'), x, y - h / 2 - 0.06, z - 0.01));
  return g;
}

/** Fusiona mallas estáticas que comparten material para reducir draw calls. */
function mergeStaticMeshes(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const groups = new Map<Mat, Array<{ object: THREE.Mesh; geometry: THREE.BufferGeometry }>>();

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    if (m.userData.noPick || m.renderOrder !== 0 || !m.visible) return;
    for (let p = m.parent; p && p !== root; p = p.parent) {
      if (p.userData.tick) return;
    }
    const src = m.geometry as THREE.BufferGeometry;
    if (src.userData.shared) return;
    const mat = m.material as Mat;
    if (mat.userData.night !== undefined) return;

    const rel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    let g = src.clone();
    if (g.index) {
      const flat = g.toNonIndexed();
      g.dispose();
      g = flat;
    }
    g.applyMatrix4(rel);
    const list = groups.get(mat) ?? [];
    list.push({ object: m, geometry: g });
    groups.set(mat, list);
  });

  for (const [mat, entries] of groups) {
    if (entries.length < 2) {
      entries.forEach((e) => e.geometry.dispose());
      continue;
    }
    const merged = mergeGeometries(entries.map((e) => e.geometry), false);
    if (!merged) {
      entries.forEach((e) => e.geometry.dispose());
      continue;
    }
    root.add(mesh(merged, mat));
    for (const e of entries) {
      e.object.parent?.remove(e.object);
      e.object.geometry.dispose();
    }
  }
}

function finish(root: THREE.Group, p: ModelParams, shadowScale = 1.45) {
  const shadow = mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: radialTexture('shadow'), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  shadow.scale.set(p.width * shadowScale, p.depth * shadowScale, 1);
  shadow.userData.noPick = true;
  shadow.raycast = () => {};
  shadow.renderOrder = -1;
  root.add(shadow);
  root.userData.radius = Math.hypot(p.width, p.depth) / 2;
  return root;
}

function insetWindow(w: number, h: number, frame: Mat, glassMat: Mat, grille: boolean) {
  const g = new THREE.Group();
  g.add(panel(w + 0.16, h + 0.16, 0.08, frame));
  g.add(panel(w, h, 0.06, glassMat, 0, 0, 0.04));
  if (grille) {
    g.add(panel(0.05, h, 0.07, frame, 0, 0, 0.08));
    g.add(panel(w, 0.05, 0.07, frame, 0, 0, 0.08));
  }
  return g;
}

/** Arepera El Guayabo — colonial de una planta, pórtico, terraza y cubierta a cuatro aguas. */
function colonialBuilding(p: ModelParams, o: BuildOpts) {
  const { width: w, depth: d } = p;
  const g = new THREE.Group();
  const wall = tintable(p.wallColor);
  const trim = tintable(shade(p.wallColor, 0.78));
  const base = tintable(shade(p.wallColor, 0.62));
  const dark = tintable('#20272a');
  const glassMat = glass('#b9e6e1', { transparent: true, opacity: 0.75 });
  const accent = tintable(p.accentColor);

  const portal = 1.7;
  const h1 = 3.8;
  const bodyD = d - portal;
  const fz = d / 2 - portal;
  g.add(box(w, h1, bodyD, wall, 0, 0, -portal / 2));
  g.add(box(w + 0.05, 0.7, bodyD + 0.05, base, 0, 0, -portal / 2));
  g.add(box(w, 0.06, portal, trim, 0, 0, d / 2 - portal / 2));

  const n = Math.max(2, Math.round(w / 2.1));
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + sw * (i + 0.5);
    const isDoor = i === Math.floor(n / 2) || (n >= 4 && i === 1);
    if (isDoor) {
      g.add(panel(Math.min(1.3, sw - 0.5), 2.4, 0.1, dark, x, 1.2, fz + 0.04));
      g.add(panel(0.08, 0.08, 0.08, accent, x + 0.35, 1.1, fz + 0.11));
    } else {
      const win = insetWindow(Math.min(1.0, sw - 0.8), 1.6, trim, glassMat, true);
      win.position.set(x, 1.05, fz + 0.05);
      g.add(win);
    }
  }

  const colH = h1 - 0.9;
  const nc = Math.max(3, Math.round(w / 2) + 1);
  for (let i = 0; i < nc; i++) {
    const x = -w / 2 + 0.25 + ((w - 0.5) * i) / (nc - 1);
    g.add(cyl(0.16, 0.16, colH, trim, x, 0, d / 2 - 0.25, 8));
    g.add(box(0.46, 0.35, 0.46, base, x, 0, d / 2 - 0.25));
  }
  g.add(box(w + 0.1, 0.9, 0.36, accent, 0, colH, d / 2 - 0.25));
  g.add(signBoard(o.label, p.accentColor, w * 0.82, 0.62, 0, colH + 0.14, d / 2 - 0.06));
  g.add(box(w, 0.12, portal, wall, 0, h1 - 0.12, d / 2 - portal / 2));

  const roof = hipRoof(w, d, 1.7, 0.45, tintable(p.roofColor, { side: THREE.DoubleSide }), tintable(shade(p.wallColor, 0.9)));
  roof.position.y = h1;
  g.add(roof);

  for (const s of [-1, 1]) {
    const x = s * w * 0.26;
    const z = d / 2 + 1.0;
    g.add(cyl(0.07, 0.07, 0.7, lam('#8b6b4a'), x, 0, z, 8));
    g.add(cyl(0.75, 0.75, 0.06, lam('#efe5d2'), x, 0.7, z, 12));
    g.add(cyl(0.05, 0.05, 1.45, lam('#8b6b4a'), x, 0.76, z, 6));
    const umbrella = mesh(new THREE.ConeGeometry(1.1, 0.45, 8), accent);
    umbrella.position.set(x, 2.2, z);
    g.add(umbrella);
  }
  mergeStaticMeshes(g);
  return finish(g, p, 1.6);
}

/** TecnoSelva Celulares — dos plantas, escaparate de vidrio, LED y antena. */
function tecnoBuilding(p: ModelParams, o: BuildOpts) {
  const { width: w, depth: d, height: h } = p;
  const g = new THREE.Group();
  const wall = tintable(p.wallColor);
  const dark = tintable('#111827');
  const glassMat = glass('#9ad9f5', { transparent: true, opacity: 0.7 });
  const led = glowBasic(p.accentColor);
  const h1 = 3.9;
  const cg = Math.min(1.8, w * 0.3);

  g.add(box(w - cg, h, d, wall, cg / 2, 0, 0));
  g.add(box(cg, h, d - cg, wall, -w / 2 + cg / 2, 0, -cg / 2));
  g.add(box(cg, h - 0.2, cg, glassMat, -w / 2 + cg / 2, 0.2, d / 2 - cg / 2));
  for (let f = 0; f <= 2; f++) {
    const y = f === 0 ? 0 : Math.min(h - 0.18, h1 + (f - 1) * 3.3 - (f === 2 ? 0.2 : 0));
    g.add(panel(cg + 0.06, 0.18, cg + 0.06, dark, -w / 2 + cg / 2, y, d / 2 - cg / 2));
  }

  const sx0 = -w / 2 + cg + 0.2;
  const sx1 = w / 2 - 0.3;
  const sw = sx1 - sx0;
  g.add(panel(sw, 2.6, 0.1, glassMat, (sx0 + sx1) / 2, 1.5, d / 2 + 0.06));
  g.add(panel(sw, 0.2, 0.14, dark, (sx0 + sx1) / 2, 0.1, d / 2 + 0.03));
  g.add(panel(1.2, 2.4, 0.14, dark, sx1 - 0.8, 1.4, d / 2 + 0.05));
  g.add(panel(w + 0.02, 0.9, 0.3, dark, 0, 2.95, d / 2 + 0.12));
  g.add(signBoard(o.label, p.accentColor, w * 0.7, 0.6, cg * 0.25, 3.1, d / 2 + 0.28));
  g.add(panel(w + 0.06, 0.1, 0.34, led, 0, 2.9, d / 2 + 0.12));

  for (let f = 1; f < Math.max(2, Math.round(h / 3.3)); f++) {
    const y0 = h1 + (f - 1) * 3.3;
    if (y0 > h - 1) break;
    g.add(panel(sw, 2.4, 0.1, glassMat, (sx0 + sx1) / 2, y0 + 1.55, d / 2 + 0.06));
    g.add(panel(sw, 0.08, 0.14, dark, (sx0 + sx1) / 2, y0 + 1.6, d / 2 + 0.03));
    for (let i = 0; i <= 3; i++) g.add(panel(0.07, 2.6, 0.14, dark, sx0 + (sw * i) / 3, y0 + 1.55, d / 2 + 0.03));
  }
  g.add(panel(w + 0.08, 0.1, d + 0.08, led, 0, h - 0.12, 0));
  g.add(box(w + 0.06, 0.35, d + 0.06, dark, 0, h - 0.35, 0));
  g.add(cyl(0.08, 0.08, 2.6, tintable('#c8d2d9'), w / 4, h, -d / 4, 8));
  const dish = mesh(new THREE.ConeGeometry(0.65, 0.4, 10), tintable('#c8d2d9'));
  dish.position.set(-w / 4, h + 0.9, -d / 4);
  dish.rotation.z = -0.9;
  g.add(dish);
  g.add(panel(1.1, 0.7, 0.9, tintable('#aeb9c0'), 0, h, -d / 3));
  mergeStaticMeshes(g);
  return finish(g, p, 1.5);
}

/** Boutique Orquídea — dos plantas, escaparates, toldo a rayas y depósito de agua. */
function boutiqueBuilding(p: ModelParams, o: BuildOpts) {
  const { width: w, depth: d, height: h } = p;
  const g = new THREE.Group();
  const wall = tintable(p.wallColor);
  const base = tintable(shade(p.wallColor, 0.72));
  const accent = tintable(p.accentColor);
  const trim = tintable(p.roofColor);
  const dark = tintable('#2a2a30');
  const glassMat = glass('#cfeaf2', { transparent: true, opacity: 0.72 });
  const h1 = 3.7;

  g.add(box(w, h, d, wall, 0, 0, 0));
  g.add(box(w + 0.04, 0.6, d + 0.04, base, 0, 0, 0));
  const dw = 1.3;
  const sw = (w - dw - 1.3) / 2;
  for (const s of [-1, 1]) {
    const x = s * (dw / 2 + 0.3 + sw / 2);
    g.add(panel(sw + 0.24, 2.5, 0.08, accent, x, 1.75, d / 2 + 0.1));
    g.add(panel(sw, 2.26, 0.1, glassMat, x, 1.75, d / 2 + 0.14));
  }
  g.add(panel(dw, 2.6, 0.12, dark, 0, 1.3, d / 2 + 0.06));
  g.add(awning(w - 0.3, 1.2, p.accentColor, 3.1, d / 2));
  g.add(signBoard(o.label, p.accentColor, w * 0.62, 0.48, 0, 3.17, d / 2 + 0.02));

  if (h > h1) {
    const nw = Math.max(2, Math.floor(w / 2.3));
    for (let i = 0; i < nw; i++) {
      const x = -w / 2 + (w / nw) * (i + 0.5);
      const win = insetWindow(0.95, 2.1, trim, glassMat, false);
      win.position.set(x, h1 + 1.4, d / 2 + 0.06);
      g.add(win);
      g.add(panel(0.22, 2.1, 0.08, accent, x - 0.58, h1 + 1.4, d / 2 + 0.12));
      g.add(panel(0.22, 2.1, 0.08, accent, x + 0.58, h1 + 1.4, d / 2 + 0.12));
    }
    g.add(panel(w - 0.5, 0.12, 0.8, trim, 0, h1 + 0.28, d / 2 + 0.4));
    g.add(panel(w - 0.5, 0.07, 0.07, accent, 0, h1 + 1.25, d / 2 + 0.77));
    const nb = Math.max(2, Math.round((w - 0.5) / 0.28));
    for (let b = 0; b <= nb; b++) g.add(panel(0.035, 0.92, 0.035, dark, -(w - 0.5) / 2 + ((w - 0.5) * b) / nb, h1 + 0.8, d / 2 + 0.77));
  }
  g.add(panel(w + 0.3, 0.3, d + 0.3, trim, 0, h + 0.15, 0));
  g.add(panel(w * 0.42, 0.75, 0.25, wall, 0, h + 0.68, d / 2 + 0.02));
  g.add(panel(w * 0.46, 0.12, 0.32, trim, 0, h + 1.1, d / 2 + 0.02));
  g.add(panel(w - 0.2, 0.06, d - 0.2, tintable(p.roofColor), 0, h + 0.32, 0));
  g.add(cyl(0.65, 0.65, 1.0, tintable('#5f6b73'), -w / 2 + 1.1, h + 0.32, -d / 2 + 1.2, 12));
  mergeStaticMeshes(g);
  return finish(g, p, 1.5);
}

export function buildBusinessModel(recipe: BusinessRecipe, p: ModelParams, o: BuildOpts): THREE.Group {
  switch (recipe) {
    case 'colonial':
      return colonialBuilding(p, o);
    case 'tecno':
      return tecnoBuilding(p, o);
    case 'boutique':
      return boutiqueBuilding(p, o);
  }
}

/** Libera geometrías y materiales; las texturas en caché se comparten. */
export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
    const mat = m.material as Mat | Mat[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}
