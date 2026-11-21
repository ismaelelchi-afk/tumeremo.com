import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';

/**
 * Estilo cartográfico de TUMEREMO sobre teselas vectoriales de OpenFreeMap
 * (esquema OpenMapTiles, datos de OpenStreetMap).
 *
 * Este lienzo muestra exclusivamente la geografía: terreno, agua y malla vial.
 * No se añaden edificios, marcadores, puntos de interés ni rótulos propios.
 */

export type ThemeName = 'noite' | 'dia';

export interface Palette {
  background: string;
  residential: string;
  park: string;
  wood: string;
  water: string;
  roadMinor: string;
  roadMinorCasing: string;
  roadService: string;
  roadTrunk: string;
  track: string;
  path: string;
  text: string;
  halo: string;
  sky: string;
  horizon: string;
  fog: string;
}

export const PALETTES: Record<ThemeName, Palette> = {
  noite: {
    background: '#0a1014',
    residential: '#111b21',
    park: '#0f2a21',
    wood: '#0c211a',
    water: '#0a2635',
    roadMinor: '#33454f',
    roadMinorCasing: '#080d10',
    roadService: '#222f37',
    roadTrunk: '#e2b45a',
    track: '#3b4b3f',
    path: '#53616b',
    text: '#cbd8de',
    halo: '#0a1014',
    sky: '#081426',
    horizon: '#1a3a4d',
    fog: '#0d1b24',
  },
  dia: {
    background: '#eceee6',
    residential: '#e1e5d8',
    park: '#cfe4c4',
    wood: '#bfdab2',
    water: '#b4d6e6',
    roadMinor: '#ffffff',
    roadMinorCasing: '#c9cdc0',
    roadService: '#f6f7f1',
    roadTrunk: '#f2c46a',
    track: '#c4c9b0',
    path: '#b9b9a6',
    text: '#2a3a41',
    halo: '#f3f4ee',
    sky: '#8fc3ea',
    horizon: '#e9f1f2',
    fog: '#e4ece9',
  },
};

export const HOME = {
  center: [-61.50497, 7.30127] as [number, number],
  zoom: 16.9,
  pitch: 60,
  bearing: 17,
};

export const BOUNDS: [[number, number], [number, number]] = [
  [-61.55, 7.265],
  [-61.455, 7.34],
];

const MIN_ZOOM = 12.5;
const MAX_ZOOM = 19.6;
const SOURCE = 'osm';
const FONT = ['Noto Sans Regular'];
const FONT_BOLD = ['Noto Sans Bold'];
const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
  '© <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' +
  'Dados © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contribuidores do OpenStreetMap</a>';

const width = (a: number, b: number) =>
  ['interpolate', ['exponential', 2], ['zoom'], 12, a, 19, b] as never;

function layers(p: Palette): LayerSpecification[] {
  return [
    { id: 'background', type: 'background', paint: { 'background-color': p.background } },
    {
      id: 'landcover-wood',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'landcover',
      filter: ['==', ['get', 'class'], 'wood'] as never,
      paint: { 'fill-color': p.wood, 'fill-opacity': 0.85 },
    },
    {
      id: 'landcover-grass',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['grass', 'farmland']]] as never,
      paint: { 'fill-color': p.park, 'fill-opacity': 0.7 },
    },
    {
      id: 'landuse-residential',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood', 'commercial', 'retail']]] as never,
      paint: { 'fill-color': p.residential, 'fill-opacity': 0.9 },
    },
    {
      id: 'landuse-green',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', ['park', 'pitch', 'playground', 'recreation_ground', 'cemetery', 'stadium']]] as never,
      paint: { 'fill-color': p.park, 'fill-opacity': 0.9 },
    },
    {
      id: 'park',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'park',
      paint: { 'fill-color': p.park, 'fill-opacity': 0.9 },
    },
    {
      id: 'water',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'water',
      paint: { 'fill-color': p.water },
    },
    {
      id: 'waterway',
      type: 'line',
      source: SOURCE,
      'source-layer': 'waterway',
      paint: { 'line-color': p.water, 'line-width': width(0.6, 5) },
    },
    {
      id: 'road-casing',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: [
        'all',
        ['==', ['geometry-type'], 'LineString'],
        ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway']]],
      ] as never,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadMinorCasing,
        'line-width': [
          'interpolate',
          ['exponential', 2],
          ['zoom'],
          12,
          ['match', ['get', 'class'], ['trunk', 'primary', 'motorway'], 2.4, ['secondary', 'tertiary'], 1.6, 1.2],
          19,
          ['match', ['get', 'class'], ['trunk', 'primary', 'motorway'], 30, ['secondary', 'tertiary'], 22, 18],
        ] as never,
        'line-opacity': 0.9,
      },
    },
    {
      id: 'road-path',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 14.5,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', ['path', 'pedestrian']]]] as never,
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': p.path, 'line-width': width(0.4, 2), 'line-dasharray': [1.2, 1.6] },
    },
    {
      id: 'road-track',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 13.5,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'track']] as never,
      paint: { 'line-color': p.track, 'line-width': width(0.5, 4), 'line-dasharray': [3, 1.6] },
    },
    {
      id: 'road-service',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 14,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'class'], 'service']] as never,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': p.roadService, 'line-width': width(0.3, 9) },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 12.5,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', ['minor']]]] as never,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': p.roadMinor, 'line-width': width(0.5, 16) },
    },
    {
      id: 'road-secondary',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 12,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', ['tertiary', 'secondary']]]] as never,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': p.roadMinor, 'line-width': width(1, 20) },
    },
    {
      id: 'road-trunk',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 8,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', ['trunk', 'primary', 'motorway']]]] as never,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': p.roadTrunk, 'line-width': width(1.4, 28) },
    },
    {
      id: 'road-label',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'transportation_name',
      minzoom: 15.2,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['get', 'name'] as never,
        'text-font': FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10, 19, 13] as never,
        'text-letter-spacing': 0.04,
      },
      paint: { 'text-color': p.text, 'text-halo-color': p.halo, 'text-halo-width': 1.6, 'text-opacity': 0.8 },
    },
    {
      id: 'water-label',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'water_name',
      layout: { 'text-field': ['get', 'name'] as never, 'text-font': ['Noto Sans Italic'], 'text-size': 12 },
      paint: { 'text-color': p.text, 'text-halo-color': p.halo, 'text-halo-width': 1.4, 'text-opacity': 0.7 },
    },
    {
      id: 'place-neighbourhood',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place',
      minzoom: 14.6,
      maxzoom: 17.4,
      filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]] as never,
      layout: {
        'text-field': ['get', 'name'] as never,
        'text-font': FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 17, 13] as never,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.14,
        'text-max-width': 7,
      },
      paint: { 'text-color': p.text, 'text-halo-color': p.halo, 'text-halo-width': 1.4, 'text-opacity': 0.5 },
    },
    {
      id: 'place-city',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]] as never,
      layout: {
        'text-field': ['get', 'name'] as never,
        'text-font': FONT_BOLD,
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 14, 15, 20] as never,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.22,
      },
      paint: { 'text-color': p.text, 'text-halo-color': p.halo, 'text-halo-width': 2, 'text-opacity': 0.92 },
    },
  ];
}

export function buildStyle(theme: ThemeName): StyleSpecification {
  const p = PALETTES[theme];
  return {
    version: 8,
    name: 'tumeremo-world',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      [SOURCE]: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        attribution: ATTRIBUTION,
      },
    },
    sky: {
      'sky-color': p.sky,
      'horizon-color': p.horizon,
      'fog-color': p.fog,
      'sky-horizon-blend': 0.55,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.6,
    },
    layers: layers(p),
  } as StyleSpecification;
}

/** Reaplica la paleta sin recargar el estilo ni las teselas. */
export function themePaintUpdates(theme: ThemeName): Array<[string, string, unknown]> {
  const updates: Array<[string, string, unknown]> = [];
  for (const layer of layers(PALETTES[theme])) {
    const paint = (layer as { paint?: Record<string, unknown> }).paint;
    if (!paint) continue;
    for (const [property, value] of Object.entries(paint)) updates.push([layer.id, property, value]);
  }
  return updates;
}

export function skyFor(theme: ThemeName) {
  const p = PALETTES[theme];
  return {
    'sky-color': p.sky,
    'horizon-color': p.horizon,
    'fog-color': p.fog,
    'sky-horizon-blend': 0.55,
    'horizon-fog-blend': 0.7,
    'fog-ground-blend': 0.6,
  };
}

export const MAP_LIMITS = { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM };
