import * as maplibregl from 'maplibre-gl';
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MlMap } from 'maplibre-gl';
import * as THREE from 'three';
import type { ThemeName } from '../map/style';
import { BUSINESSES, WORLD_ORIGIN, type BusinessProfile } from './data';
import { buildBusinessModel, disposeObject, type ModelParams } from './models';
import { selectionGlowTexture } from './modelTextures';

const LIGHTS: Record<ThemeName, { ambient: string; ambientI: number; sun: string; sunI: number; glow: number }> = {
  noite: { ambient: '#9bb8d6', ambientI: 1.25, sun: '#b8cfff', sunI: 1.1, glow: 1 },
  dia: { ambient: '#ffffff', ambientI: 1.55, sun: '#fff1d6', sunI: 1.9, glow: 0 },
};

/** Resplandor cálido de vidrio de la referencia; ya no se usa para resaltar. */
const GLASS_GLOW = new THREE.Color('#ffd27a');
const FILTER_GRAY = new THREE.Color('#b9bec6');

/** Colores de categoría originales de `tumeremo-3d/src/data/categorias.ts`. */
const SELECTION_COLORS: Record<BusinessProfile['category'], string> = {
  comida: '#F97316',
  tecnologia: '#0EA5E9',
  ropa: '#DB2777',
};

interface Record3D {
  profile: BusinessProfile;
  outer: THREE.Group;
  tintable: THREE.MeshLambertMaterial[];
  glass: THREE.MeshLambertMaterial[];
  accentGlow: THREE.MeshBasicMaterial[];
  dimmed: boolean;
}

/**
 * Capa personalizada de MapLibre que dibuja únicamente los tres edificios
 * georreferenciados con three.js. Escena en metros, relativa a Plaza Bolívar.
 * La matriz final se compone en precisión doble para evitar vibración en zoom alto.
 *
 * La selección recupera el indicador original de `tumeremo-3d/three/BusinessLayer.ts`:
 * anillo, onda expansiva y halo radial sobre el suelo, sin marcas sobre el edificio.
 */
export class ThreeBusinessLayer implements CustomLayerInterface {
  id = 'tumeremo-businesses-3d';
  type = 'custom' as const;
  renderingMode = '3d' as const;

  private map: MlMap | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private ambient = new THREE.AmbientLight('#ffffff', 1);
  private sun = new THREE.DirectionalLight('#ffffff', 1);
  private originMc = maplibregl.MercatorCoordinate.fromLngLat([WORLD_ORIGIN.lng, WORLD_ORIGIN.lat]);
  private meter = this.originMc.meterInMercatorCoordinateUnits();
  private M = new THREE.Matrix4();
  private L = new THREE.Matrix4();
  private raycaster = new THREE.Raycaster();
  private hasMatrix = false;
  private records: Record3D[] = [];
  private selected: string | null = null;
  private glow = 1;

  private ring: THREE.Mesh;
  private ripple: THREE.Mesh;
  private halo: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;
  private rippleMat: THREE.MeshBasicMaterial;
  private haloMat: THREE.MeshBasicMaterial;

  constructor(theme: ThemeName) {
    this.L.makeTranslation(this.originMc.x, this.originMc.y, 0).scale(new THREE.Vector3(this.meter, -this.meter, this.meter));
    this.sun.position.set(-60, -80, 110);
    this.scene.add(this.ambient, this.sun);

    // Indicador original: geometrías, alturas y renderOrder de BusinessLayer.ts.
    this.ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 64), this.ringMat);
    this.rippleMat = this.ringMat.clone();
    this.ripple = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), this.rippleMat);
    this.haloMat = new THREE.MeshBasicMaterial({
      map: selectionGlowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    });
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.haloMat);
    for (const m of [this.ring, this.ripple, this.halo]) {
      m.visible = false;
      m.frustumCulled = false;
      m.renderOrder = 3;
      this.scene.add(m);
    }

    for (const profile of BUSINESSES) {
      const params: ModelParams = {
        width: profile.width,
        depth: profile.depth,
        height: profile.height,
        wallColor: profile.facade,
        roofColor: profile.roof,
        accentColor: profile.accent,
      };
      const seed = [...profile.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 6;
      const inner = buildBusinessModel(profile.recipe, params, { label: profile.sign, seed });

      const tintable = new Set<THREE.MeshLambertMaterial>();
      const glass = new Set<THREE.MeshLambertMaterial>();
      const accentGlow = new Set<THREE.MeshBasicMaterial>();
      inner.traverse((obj) => {
        const mats = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (!mats) return;
        for (const m of Array.isArray(mats) ? mats : [mats]) {
          if (m instanceof THREE.MeshLambertMaterial) {
            if (m.userData.tintable) tintable.add(m);
            if (m.userData.glass) glass.add(m);
          }
          if (m instanceof THREE.MeshBasicMaterial && m.userData.glowBasic) accentGlow.add(m);
        }
      });

      // three.js local Y-up → mundo Z-up de MapLibre.
      const model = new THREE.Group();
      model.rotation.x = Math.PI / 2;
      model.add(inner);
      const outer = new THREE.Group();
      outer.add(model);
      outer.userData.buildingId = profile.id;

      const [x, y] = this.toScene([profile.lng, profile.lat]);
      outer.position.set(x, y, 0);
      outer.rotation.z = THREE.MathUtils.degToRad(180 - profile.heading);
      this.scene.add(outer);
      this.records.push({
        profile,
        outer,
        tintable: [...tintable],
        glass: [...glass],
        accentGlow: [...accentGlow],
        dimmed: false,
      });
    }

    this.setTheme(theme);
  }

  onAdd(map: MlMap, gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
    this.renderer.autoClear = false;
    this.raycaster.camera = this.camera;
  }

  onRemove() {
    for (const rec of this.records) disposeObject(rec.outer);
    this.records = [];
    for (const m of [this.ring, this.ripple, this.halo]) disposeObject(m);
    this.renderer?.dispose();
    this.renderer = null;
    this.map = null;
  }

  render(_gl: WebGL2RenderingContext | WebGLRenderingContext, args: CustomRenderMethodInput) {
    this.M.fromArray(args.defaultProjectionData.mainMatrix as unknown as ArrayLike<number>);
    this.camera.projectionMatrix.multiplyMatrices(this.M, this.L);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.hasMatrix = true;

    if (this.selected) {
      this.updateIndicator();
      this.map?.triggerRepaint();
    }

    this.renderer?.resetState();
    this.renderer?.render(this.scene, this.camera);
  }

  private toScene(p: [number, number]): [number, number] {
    const mc = maplibregl.MercatorCoordinate.fromLngLat(p);
    return [(mc.x - this.originMc.x) / this.meter, -(mc.y - this.originMc.y) / this.meter];
  }

  /** Edificio bajo un punto del canvas (px relativos al canvas), o null. */
  pick(point: { x: number; y: number }): string | null {
    if (!this.hasMatrix || !this.map) return null;
    const canvas = this.map.getCanvas();
    const nx = (point.x / canvas.clientWidth) * 2 - 1;
    const ny = -((point.y / canvas.clientHeight) * 2 - 1);
    const inv = this.camera.projectionMatrixInverse;
    const near = new THREE.Vector3(nx, ny, -1).applyMatrix4(inv);
    const far = new THREE.Vector3(nx, ny, 1).applyMatrix4(inv);
    this.raycaster.set(near, far.sub(near).normalize());
    this.raycaster.far = Infinity;
    const hits = this.raycaster.intersectObjects(this.records.map((r) => r.outer), true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.buildingId) o = o.parent;
      if (o) return o.userData.buildingId as string;
    }
    return null;
  }

  /** Coloca, colorea y muestra el indicador; `null` lo oculta por completo. */
  setSelected(id: string | null) {
    this.selected = id;
    const rec = id ? this.records.find((r) => r.profile.id === id) : undefined;
    const visible = !!rec;
    this.ring.visible = this.ripple.visible = this.halo.visible = visible;

    if (rec) {
      const footprint = Math.max(rec.profile.width, rec.profile.depth);
      const s = footprint * 0.85 + 1.2;
      const [x, y] = this.toScene([rec.profile.lng, rec.profile.lat]);
      this.ring.position.set(x, y, 0.04);
      this.ripple.position.set(x, y, 0.04);
      this.halo.position.set(x, y, 0.035);
      this.ring.scale.setScalar(s);
      this.ripple.scale.setScalar(s);
      this.halo.scale.setScalar(s * 2.4);

      const color = new THREE.Color(SELECTION_COLORS[rec.profile.category]);
      this.ringMat.color.copy(color);
      this.rippleMat.color.copy(color);
      this.haloMat.color.copy(color);
    }
    this.applyBuildingLighting();
    this.map?.triggerRepaint();
  }

  /**
   * `pulse = (sin(t * 3.2) + 1) / 2`, opacidades 0.65+0.35pulse y 0.35+0.25pulse,
   * onda `(t * 0.6) % 1` escalada hasta ×1.7: misma animación que BusinessLayer.update().
   */
  private updateIndicator() {
    const time = performance.now() / 1000;
    const pulse = (Math.sin(time * 3.2) + 1) / 2;
    this.ringMat.opacity = 0.65 + pulse * 0.35;
    const r = (time * 0.6) % 1;
    this.ripple.scale.setScalar(this.ring.scale.x * (1 + r * 0.7));
    this.rippleMat.opacity = (1 - r) * 0.7;
    this.haloMat.opacity = 0.35 + pulse * 0.25;
  }

  /** Atenúa los edificios fuera del filtro, como `BusinessLayer.setVisible()`. */
  setVisible(ids: Set<string> | null) {
    for (const rec of this.records) rec.dimmed = ids ? !ids.has(rec.profile.id) : false;
    this.applyBuildingLighting();
    this.map?.triggerRepaint();
  }

  /** Iluminación base y filtros; la selección no altera estos materiales. */
  private applyBuildingLighting() {
    for (const rec of this.records) {
      const dimmed = rec.dimmed && rec.profile.id !== this.selected;
      for (const m of rec.tintable) {
        m.color.copy(m.userData.base as THREE.Color);
        if (dimmed) m.color.lerp(FILTER_GRAY, 0.7).multiplyScalar(0.9);
        m.emissive.set(0x000000);
      }
      for (const m of rec.glass) {
        m.emissive.copy(GLASS_GLOW);
        m.emissiveIntensity = this.glow * (dimmed ? 0.2 : 0.95);
      }
      const accentScale = (0.5 + 0.5 * this.glow) * (dimmed ? 0.45 : 1);
      for (const m of rec.accentGlow) {
        m.color.copy(m.userData.glowBasic as THREE.Color).multiplyScalar(accentScale);
      }
    }
  }

  setTheme(theme: ThemeName) {
    const light = LIGHTS[theme];
    this.ambient.color.set(light.ambient);
    this.ambient.intensity = light.ambientI * Math.PI;
    this.sun.color.set(light.sun);
    this.sun.intensity = light.sunI * Math.PI;
    this.glow = light.glow;
    this.scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!mats) return;
      for (const m of Array.isArray(mats) ? mats : [mats]) {
        const ud = m.userData;
        if (ud.glow !== undefined) (m as THREE.MeshLambertMaterial).emissiveIntensity = this.glow * (ud.glow as number);
        if (ud.glowBasic) {
          (m as THREE.MeshBasicMaterial).color.copy(ud.glowBasic as THREE.Color).multiplyScalar(0.5 + 0.5 * this.glow);
        }
        if (ud.night !== undefined) {
          m.opacity = (ud.night as number) * this.glow;
          o.visible = this.glow > 0.02;
        }
      }
    });
    this.applyBuildingLighting();
    this.map?.triggerRepaint();
  }

  /** Posición geográfica del edificio, para centrar el mapa al seleccionarlo. */
  positionOf(id: string): [number, number] | null {
    const rec = this.records.find((r) => r.profile.id === id);
    return rec ? [rec.profile.lng, rec.profile.lat] : null;
  }
}
