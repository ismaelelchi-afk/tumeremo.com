/**
 * Datos canónicos de los tres comercios incorporados desde `tumeremo-3d`.
 *
 * Fuente: `tumeremo-3d/src/data/negocios.json` y la capa pública
 * `tumeremo-plan/src/data/featureBusinesses.ts`. Auditoría de la referencia:
 * `negocios.json` no trae `productos`/`promociones`; `core/seed.ts` inicializa
 * ambas listas vacías y `data/publico.ts` solo transforma lo publicado en el
 * Studio. No existen productos, fotos de producto ni precios originales para
 * estos tres comercios, así que `products` y `promotions` se entregan vacíos
 * sin inventar contenido.
 *
 * La identidad y la posición pertenecen al edificio. No se crea ninguna fuente
 * GeoJSON ni marcador independiente para los comercios.
 */
import type { Lang } from '../i18n';

export type BusinessRecipe = 'colonial' | 'tecno' | 'boutique';

export interface CatalogEntry {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price?: string;
  badge?: string;
}

export interface BusinessContact {
  phone: string;
  whatsapp: string;
  instagram: string;
  email: string;
}

export interface BusinessProfile {
  /** ID estable del edificio: clave de selección en el mapa. */
  id: string;
  businessId: string;
  recipe: BusinessRecipe;
  name: string;
  sign: string;
  category: 'comida' | 'tecnologia' | 'ropa';
  categoryLabel: Record<Lang, string>;
  emoji: string;
  slogan: string;
  description: string;
  address: string;
  hours: string;
  rating: number;
  tags: string[];
  photos: string[];
  contact: BusinessContact;
  products: CatalogEntry[];
  promotions: CatalogEntry[];
  accent: string;
  facade: string;
  roof: string;
  /** Parámetros originales del modelo (ancho/fondo en metros). */
  width: number;
  depth: number;
  height: number;
  /** Posición geográfica del edificio, derivada de las coordenadas locales. */
  lng: number;
  lat: number;
  /** Rotación original de la fachada en grados horarios desde el norte. */
  heading: number;
}

/** Origen real del mapa: Plaza Bolívar, Tumeremo (mismo que Tumeremo Plan). */
export const WORLD_ORIGIN = { lng: -61.504973, lat: 7.30127 } as const;

const RAD = Math.PI / 180;

/** Conversión determinista metros locales (x=este, z=norte) → lng/lat. */
export function localToWorld(x: number, z: number): { lng: number; lat: number } {
  return {
    lng: WORLD_ORIGIN.lng + x / (111320 * Math.cos(WORLD_ORIGIN.lat * RAD)),
    lat: WORLD_ORIGIN.lat + z / 110574,
  };
}

/**
 * Los tres edificios se derivan de las coordenadas locales originales
 * (x = -21.2, -15, -8.8; z = 10.2; rotación 180). La separación original entre
 * fachadas era de apenas 0,2 m, por lo que se abre a 12 m entre centros
 * (~6 m entre edificios) manteniendo el promedio x = -15 y la misma fila z.
 * Esto conserva el origen, la orientación y la zona comercial equilibrada.
 */
const PLACEMENT = { z: 10.2, heading: 180, xs: [-27, -15, -3] } as const;

interface Source extends Omit<BusinessProfile, 'lng' | 'lat' | 'heading'> {
  localX: number;
}

const SOURCES: Source[] = [
  {
    id: 'arepera-el-guayabo',
    businessId: 'biz_arepera-el-guayabo',
    recipe: 'colonial',
    name: 'Arepera El Guayabo',
    sign: 'AREPERA EL GUAYABO',
    category: 'comida',
    categoryLabel: { es: 'Comida', 'pt-BR': 'Comida' },
    emoji: '🍽️',
    slogan: 'Arepas recién hechas desde el amanecer',
    description:
      'Arepas asadas en budare con rellenos criollos: reina pepiada, pabellón, dominó y queso de mano. Jugos naturales de frutas de temporada y café guayoyo.',
    address: 'Av. Principal, local 3 (ficticia)',
    hours: 'Lun – Sáb · 6:00 a.m. – 2:00 p.m.',
    rating: 4.7,
    tags: ['Desayunos', 'Para llevar', 'Comida criolla'],
    photos: [
      'https://images.pexels.com/photos/30005123/pexels-photo-30005123.jpeg?auto=compress&cs=tinysrgb&w=900',
      'https://images.pexels.com/photos/32924384/pexels-photo-32924384.jpeg?auto=compress&cs=tinysrgb&w=900',
      'https://images.pexels.com/photos/13191276/pexels-photo-13191276.jpeg?auto=compress&cs=tinysrgb&w=900',
    ],
    contact: {
      phone: '0288-000-0101',
      whatsapp: '+58 000 000 0101',
      instagram: '@arepera.demo',
      email: 'arepera@demo.tumeremo.com',
    },
    products: [],
    promotions: [],
    accent: '#1F8A70',
    facade: '#F6B74A',
    roof: '#B5532F',
    width: 6,
    depth: 7,
    height: 5.5,
    localX: PLACEMENT.xs[0],
  },
  {
    id: 'tecnoselva-celulares',
    businessId: 'biz_tecnoselva-celulares',
    recipe: 'tecno',
    name: 'TecnoSelva Celulares',
    sign: 'TECNOSELVA',
    category: 'tecnologia',
    categoryLabel: { es: 'Tecnología', 'pt-BR': 'Tecnologia' },
    emoji: '💻',
    slogan: 'Tu teléfono, siempre conectado',
    description:
      'Venta de teléfonos, accesorios, cargadores solares y planes de datos. Servicio técnico express para pantallas y baterías.',
    address: 'Av. Principal, local 5 (ficticia)',
    hours: 'Lun – Sáb · 8:30 a.m. – 6:30 p.m.',
    rating: 4.4,
    tags: ['Celulares', 'Accesorios', 'Servicio técnico'],
    photos: [
      'https://images.pexels.com/photos/31862950/pexels-photo-31862950.jpeg?auto=compress&cs=tinysrgb&w=900',
      'https://images.pexels.com/photos/14534828/pexels-photo-14534828.jpeg?auto=compress&cs=tinysrgb&w=900',
      'https://images.pexels.com/photos/6755075/pexels-photo-6755075.jpeg?auto=compress&cs=tinysrgb&w=900',
    ],
    contact: {
      phone: '0288-000-0102',
      whatsapp: '+58 000 000 0102',
      instagram: '@tecnoselva.demo',
      email: 'ventas@demo.tumeremo.com',
    },
    products: [],
    promotions: [],
    accent: '#00A6FB',
    facade: '#E8EEF2',
    roof: '#5D6D7E',
    width: 6,
    depth: 7,
    height: 7.2,
    localX: PLACEMENT.xs[1],
  },
  {
    id: 'boutique-orquidea',
    businessId: 'biz_boutique-orquidea',
    recipe: 'boutique',
    name: 'Boutique Orquídea',
    sign: 'BOUTIQUE ORQUÍDEA',
    category: 'ropa',
    categoryLabel: { es: 'Ropa', 'pt-BR': 'Roupas' },
    emoji: '👟',
    slogan: 'Moda fresca para el trópico',
    description:
      'Ropa femenina ligera, vestidos de lino, accesorios artesanales y bisutería. Asesoría de imagen sin costo los sábados.',
    address: 'Av. Principal con Calle 2, local 7 (ficticia)',
    hours: 'Lun – Sáb · 9:00 a.m. – 7:00 p.m.',
    rating: 4.8,
    tags: ['Damas', 'Accesorios', 'Lino'],
    photos: [
      'https://images.pexels.com/photos/5531542/pexels-photo-5531542.jpeg?auto=compress&cs=tinysrgb&w=900',
      'https://images.pexels.com/photos/5698862/pexels-photo-5698862.jpeg?auto=compress&cs=tinysrgb&w=900',
      'https://images.pexels.com/photos/5698847/pexels-photo-5698847.jpeg?auto=compress&cs=tinysrgb&w=900',
    ],
    contact: {
      phone: '0288-000-0103',
      whatsapp: '+58 000 000 0103',
      instagram: '@orquidea.demo',
      email: 'orquidea@demo.tumeremo.com',
    },
    products: [],
    promotions: [],
    accent: '#8E3B8A',
    facade: '#F2A7C3',
    roof: '#7B3F61',
    width: 5.8,
    depth: 7,
    height: 6.8,
    localX: PLACEMENT.xs[2],
  },
];

/** Los tres edificios, con su posición geográfica ya resuelta. */
export const BUSINESSES: BusinessProfile[] = SOURCES.map(({ localX, ...source }) => ({
  ...source,
  ...localToWorld(localX, PLACEMENT.z),
  heading: PLACEMENT.heading,
}));

const BY_ID = new Map(BUSINESSES.map((business) => [business.id, business]));

/** Ficha asociada a un edificio; `undefined` para cualquier otra entidad. */
export function getBusiness(buildingId: string | null): BusinessProfile | undefined {
  return buildingId ? BY_ID.get(buildingId) : undefined;
}
