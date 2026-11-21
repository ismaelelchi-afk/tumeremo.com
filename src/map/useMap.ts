import { useCallback, useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MlMap } from 'maplibre-gl';
import { getBusiness, type BusinessProfile } from '../businesses/data';
import { ThreeBusinessLayer } from '../businesses/ThreeBusinessLayer';
import {
  BOUNDS,
  HOME,
  MAP_LIMITS,
  buildStyle,
  skyFor,
  themePaintUpdates,
  type ThemeName,
} from './style';

const DEFAULT_THEME: ThemeName = 'noite';
const THEME_KEY = 'tumeremo-world:theme';
const LOOK = { center: HOME.center, zoom: HOME.zoom, pitch: HOME.pitch, bearing: HOME.bearing };

/**
 * Parámetros de `CityScene.focus()` / `CameraRig.flyTo()` de Tumeremo 3D.
 * Se traducen a MapLibre sin alterar la cartografía ni los límites base.
 */
const FOCUS = {
  duration: 1200,
  curve: 1.2,
  polar: 0.98,
  azimuthOffset: 0.42,
  minZoom: 18.6,
  maxZoom: 21,
} as const;

const RAD = Math.PI / 180;
const HALF_FOV_TAN = Math.tan((36.87 * Math.PI) / 360);

/** `CameraRig.flyTo` original: cubic ease-in-out. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function initialTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'dia' || saved === 'noite' ? saved : DEFAULT_THEME;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeBearing(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Camino angular más corto, como `CameraRig.flyTo` con `atan2`. */
function bearingTowards(current: number, target: number): number {
  const delta = normalizeBearing(target - current + 180) - 180;
  return normalizeBearing(current + delta);
}

/**
 * `clamp(20 + altura*1.7 + huella*1.3, 28, 62) + (mobile ? 8 : 0)`.
 * Tumeremo 3D usa `footprint = max(ancho, fondo)` en `BusinessLayer.info()`.
 */
function focusDistance(profile: BusinessProfile, mobile: boolean): number {
  const footprint = Math.max(profile.width, profile.depth);
  return clamp(20 + profile.height * 1.7 + footprint * 1.3, 28, 62) + (mobile ? 8 : 0);
}

/** Distancia 3D → zoom de MapLibre, con el FOV de la cámara cartográfica. */
function distanceToZoom(distance: number, lat: number): number {
  const metersPerPixel = distance / (Math.max(320, window.innerHeight) * 0.5 / HALF_FOV_TAN);
  return clamp(
    Math.log2((78271.516 * Math.cos(lat * RAD)) / metersPerPixel),
    FOCUS.minZoom,
    FOCUS.maxZoom,
  );
}

interface CameraView {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  elevation: number;
}

function currentView(map: MlMap): CameraView {
  return {
    center: map.getCenter().toArray() as [number, number],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
    elevation: map.getCameraTargetElevation(),
  };
}

function homeView(map: MlMap): CameraView {
  return {
    center: LOOK.center,
    zoom: LOOK.zoom,
    pitch: map.getPitch() > 10 ? LOOK.pitch : 0,
    bearing: LOOK.bearing,
    elevation: 0,
  };
}

export interface MapActions {
  zoomIn(): void;
  zoomOut(): void;
  rotateLeft(): void;
  rotateRight(): void;
  goHome(): void;
  goTo(lat: number, lng: number): void;
  focusBuilding(id: string): void;
  setBusinessFilter(ids: string[] | null): void;
}

export function useMap(onError: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const layerRef = useRef<ThreeBusinessLayer | null>(null);
  const errorRef = useRef(onError);
  const errorCount = useRef(0);
  const notified = useRef(false);
  const beforeFocus = useRef<CameraView | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  errorRef.current = onError;

  const themeRef = useRef<ThemeName>(theme);
  themeRef.current = theme;

  const restoreMaxZoom = useCallback(() => {
    const map = mapRef.current;
    if (map && map.getMaxZoom() !== MAP_LIMITS.maxZoom) map.setMaxZoom(MAP_LIMITS.maxZoom);
  }, []);

  /** Vuelo directo y continuo al edificio: una sola transición, sin saltos. */
  const focusBuilding = useCallback((id: string) => {
    const map = mapRef.current;
    const profile = getBusiness(id);
    if (!map || !profile) return;

    const mobile = window.innerWidth < 640;
    const distance = focusDistance(profile, mobile);
    const zoom = distanceToZoom(distance, profile.lat);
    const pitch = FOCUS.polar / RAD;
    const bearing = bearingTowards(map.getBearing(), profile.heading + FOCUS.azimuthOffset / RAD);

    // El zoom de referencia se permite solo mientras hay una ficha enfocada.
    map.stop();
    map.setMaxZoom(FOCUS.maxZoom);
    map.flyTo({
      center: [profile.lng, profile.lat],
      zoom,
      pitch,
      bearing,
      // `CityScene.focus()` sitúa el objetivo en `altura * 0.25`.
      elevation: profile.height * 0.25,
      duration: FOCUS.duration,
      curve: FOCUS.curve,
      easing: easeInOut,
      essential: true,
      padding: { top: 0, left: 0, right: 0, bottom: mobile ? Math.round(window.innerHeight * 0.42) : 0 },
    });
  }, []);

  const selectBuilding = useCallback(
    (id: string | null) => {
      const map = mapRef.current;

      if (id && !selectedRef.current && map) beforeFocus.current = currentView(map);

      selectedRef.current = id;
      layerRef.current?.setSelected(id);
      setSelectedBuildingId(id);

      if (id) {
        focusBuilding(id);
        return;
      }

      const previous = beforeFocus.current;
      beforeFocus.current = null;
      if (!map || !previous) return;
      map.stop();
      map.once('moveend', restoreMaxZoom);
      map.flyTo({
        center: previous.center,
        zoom: previous.zoom,
        pitch: previous.pitch,
        bearing: previous.bearing,
        elevation: previous.elevation,
        duration: FOCUS.duration,
        curve: FOCUS.curve,
        easing: easeInOut,
        essential: true,
      });
    },
    [focusBuilding, restoreMaxZoom],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(themeRef.current),
      ...LOOK,
      minZoom: MAP_LIMITS.minZoom,
      maxZoom: MAP_LIMITS.maxZoom,
      maxPitch: 75,
      maxBounds: BOUNDS,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
      fadeDuration: 120,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const layer = new ThreeBusinessLayer(themeRef.current);
    layerRef.current = layer;

    // Igual que `MapControls.addEventListener('start')`: el gesto del usuario
    // interrumpe el tween automático y conserva la navegación de MapLibre.
    const stopFlight = () => map.stop();
    const early = ['touchstart', 'mousedown', 'wheel', 'dblclick'] as const;
    for (const event of early) map.on(event, stopFlight);

    map.on('load', () => {
      map.addLayer(layer);

      map.on('click', (event) => {
        selectBuilding(layer.pick(event.point));
      });

      map.on('mousemove', (event) => {
        const canvas = map.getCanvas();
        canvas.style.cursor = layer.pick(event.point) ? 'pointer' : '';
      });

      setReady(true);
      // Recorrido de apertura de la pantalla principal.
      map.jumpTo({ center: LOOK.center, zoom: LOOK.zoom - 2.2, pitch: 0, bearing: 0 });
      map.flyTo({ ...LOOK, duration: 3200, curve: 1.2, essential: true });
    });

    map.on('error', () => {
      errorCount.current += 1;
      if (errorCount.current >= 4 && !notified.current) {
        notified.current = true;
        errorRef.current();
      }
    });

    return () => {
      setReady(false);
      for (const event of early) map.off(event, stopFlight);
      layerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
    // El mapa se crea una sola vez; el tema se aplica con setPaintProperty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectBuilding]);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    for (const [layer, property, value] of themePaintUpdates(next)) {
      try {
        map.setPaintProperty(layer, property as Parameters<MlMap['setPaintProperty']>[1], value as never);
      } catch {
        // Una capa todavía no está disponible en este estilo.
      }
    }
    try {
      (map as unknown as { setSky?: (sky: ReturnType<typeof skyFor>) => void }).setSky?.(skyFor(next));
    } catch {
      // El navegador no admite sky; el mapa sigue funcionando.
    }
    layerRef.current?.setTheme(next);
  }, []);

  const actions = useRef<MapActions>({
    zoomIn: () => mapRef.current?.zoomIn({ duration: 350 }),
    zoomOut: () => mapRef.current?.zoomOut({ duration: 350 }),
    rotateLeft: () => {
      const map = mapRef.current;
      if (map) map.easeTo({ bearing: map.getBearing() - 45, duration: 450 });
    },
    rotateRight: () => {
      const map = mapRef.current;
      if (map) map.easeTo({ bearing: map.getBearing() + 45, duration: 450 });
    },
    goHome: () => {
      const map = mapRef.current;
      if (!map) return;
      const view = homeView(map);
      if (selectedRef.current) beforeFocus.current = view;
      map.once('moveend', restoreMaxZoom);
      map.flyTo({ ...view, duration: 1800, essential: true });
    },
    goTo: (lat, lng) => {
      const map = mapRef.current;
      if (!map) return;
      beforeFocus.current = null;
      map.stop();
      map.flyTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 17.6),
        duration: 1400,
        essential: true,
      });
    },
    focusBuilding,
    setBusinessFilter: (ids) => {
      layerRef.current?.setVisible(ids ? new Set(ids) : null);
    },
  });

  return {
    containerRef,
    ready,
    theme,
    setTheme,
    actions: actions.current,
    selectedBuildingId,
    selectBuilding,
  };
}
