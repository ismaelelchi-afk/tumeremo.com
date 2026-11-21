/**
 * Categorías reales de los tres comercios, adaptadas de
 * `tumeremo-3d/src/data/categorias.ts`. No se incluyen categorías sin negocio.
 */
import type { Lang } from '../i18n';
import type { BusinessProfile } from './data';

export type BusinessCategoryId = BusinessProfile['category'];

export interface BusinessCategory {
  id: BusinessCategoryId;
  color: string;
  emoji: string;
  label: Record<Lang, string>;
  short: Record<Lang, string>;
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    id: 'comida',
    color: '#F97316',
    emoji: '🍽️',
    label: { es: 'Restaurantes y comida', 'pt-BR': 'Restaurantes e comida' },
    short: { es: 'Comida', 'pt-BR': 'Comida' },
  },
  {
    id: 'tecnologia',
    color: '#0EA5E9',
    emoji: '💻',
    label: { es: 'Tecnología', 'pt-BR': 'Tecnologia' },
    short: { es: 'Tecnología', 'pt-BR': 'Tecnologia' },
  },
  {
    id: 'ropa',
    color: '#DB2777',
    emoji: '👟',
    label: { es: 'Ropa y calzado', 'pt-BR': 'Roupas e calçados' },
    short: { es: 'Ropa', 'pt-BR': 'Roupas' },
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  BUSINESS_CATEGORIES.map((category) => [category.id, category]),
) as Record<BusinessCategoryId, BusinessCategory>;

/** Normaliza texto para búsquedas sin acentos ni mayúsculas, como `normalizar()`. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Equivale a `filtrarNegocios()` de la referencia, sobre `BusinessProfile`. */
export function filterBusinesses(
  businesses: BusinessProfile[],
  category: BusinessCategoryId | 'todos',
  query: string,
): BusinessProfile[] {
  const q = normalizeText(query);
  return businesses.filter((business) => {
    if (category !== 'todos' && business.category !== category) return false;
    if (!q) return true;
    const catalog = [
      ...business.products.map((product) => product.name),
      ...business.promotions.map((promotion) => promotion.name),
    ].join(' ');
    const fields = normalizeText(
      [
        business.name,
        business.tags.join(' '),
        business.slogan,
        business.description,
        business.address,
        catalog,
      ].join(' '),
    );
    return q.split(/\s+/).every((term) => fields.includes(term));
  });
}

/** Conteo por categoría usado por los chips, como `contarPorCategoria()`. */
export function countByCategory(businesses: BusinessProfile[]): Record<BusinessCategoryId, number> {
  const counts = { comida: 0, tecnologia: 0, ropa: 0 };
  for (const business of businesses) counts[business.category] += 1;
  return counts;
}

/** Solo categorías con comercios reales, en el orden original. */
export function categoriesInUse(businesses: BusinessProfile[]): BusinessCategory[] {
  const counts = countByCategory(businesses);
  return BUSINESS_CATEGORIES.filter((category) => counts[category.id] > 0);
}
