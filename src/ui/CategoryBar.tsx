import type { Lang } from '../i18n';
import {
  categoriesInUse,
  countByCategory,
  type BusinessCategoryId,
} from '../businesses/categories';
import type { BusinessProfile } from '../businesses/data';
import { Icon } from './Icons';

interface Props {
  value: BusinessCategoryId | 'todos';
  onChange(value: BusinessCategoryId | 'todos'): void;
  businesses: BusinessProfile[];
  lang: Lang;
  allLabel: string;
  ariaLabel: string;
}

/** Chips de categoría con conteos, adaptados de `CategoryBar.tsx` de Tumeremo 3D. */
export function CategoryBar({ value, onChange, businesses, lang, allLabel, ariaLabel }: Props) {
  const counts = countByCategory(businesses);
  const visible = categoriesInUse(businesses);

  return (
    <nav className="category-bar no-scrollbar" aria-label={ariaLabel}>
      <Chip
        active={value === 'todos'}
        onClick={() => onChange('todos')}
        color="#0b3b2e"
        count={businesses.length}
      >
        <Icon name="grid" size={15} />
        <span className="category-name">{allLabel}</span>
      </Chip>

      {visible.map((category) => (
        <Chip
          key={category.id}
          active={value === category.id}
          onClick={() => onChange(category.id)}
          color={category.color}
          count={counts[category.id]}
          title={category.label[lang]}
        >
          <span className="category-emoji" aria-hidden="true">{category.emoji}</span>
          <span className="category-name category-short">{category.short[lang]}</span>
          <span className="category-name category-full">{category.label[lang]}</span>
        </Chip>
      ))}
    </nav>
  );
}

function Chip({
  active,
  onClick,
  color,
  count,
  title,
  children,
}: {
  active: boolean;
  onClick(): void;
  color: string;
  count: number;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`category-chip ${active ? 'is-active' : ''}`}
      style={active ? { backgroundColor: color } : undefined}
    >
      {children}
      <span className={`category-count ${active ? 'is-active' : ''}`}>{count}</span>
    </button>
  );
}
