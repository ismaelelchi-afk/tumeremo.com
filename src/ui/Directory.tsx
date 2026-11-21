import type { Lang, TranslationKey } from '../i18n';
import { CATEGORY_BY_ID } from '../businesses/categories';
import type { BusinessProfile } from '../businesses/data';
import { Icon } from './Icons';

interface Props {
  items: BusinessProfile[];
  selectedId: string | null;
  title: string;
  lang: Lang;
  onPick(business: BusinessProfile): void;
  onClose(): void;
  onClearFilters(): void;
  t: (key: TranslationKey) => string;
}

/** Directorio lateral/móvil con los mismos resultados que el mapa y la búsqueda. */
export function Directory({ items, selectedId, title, lang, onPick, onClose, onClearFilters, t }: Props) {
  const countLabel = `${items.length} ${items.length === 1 ? t('directory.one') : t('directory.many')} · ${t('directory.demo')}`;

  return (
    <section className="directory" aria-label={t('directory.aria')}>
      <div className="directory-handle" aria-hidden="true">
        <span />
      </div>
      <header className="directory-header">
        <div className="directory-heading">
          <h2 className="directory-title">{title}</h2>
          <p className="directory-count">{countLabel}</p>
        </div>
        <button type="button" className="directory-close" onClick={onClose} aria-label={t('directory.close')}>
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="directory-body no-scrollbar">
        {items.length === 0 ? (
          <div className="directory-empty">
            <Icon name="search" size={38} className="directory-empty-icon" />
            <p>{t('directory.empty')}</p>
            <button type="button" className="directory-clear" onClick={onClearFilters}>
              {t('directory.clear')}
            </button>
          </div>
        ) : (
          <ul className="directory-list">
            {items.map((business) => {
              const category = CATEGORY_BY_ID[business.category];
              const active = business.id === selectedId;
              return (
                <li key={business.id}>
                  <button
                    type="button"
                    className={`directory-item ${active ? 'is-active' : ''}`}
                    onClick={() => onPick(business)}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span
                      className="directory-icon"
                      aria-hidden="true"
                      style={{ backgroundColor: `${category.color}22` }}
                    >
                      {category.emoji}
                    </span>
                    <span className="directory-item-text">
                      <span className="directory-item-name">{business.name}</span>
                      <span className="directory-item-category">
                        <span className="directory-dot" style={{ backgroundColor: category.color }} />
                        {category.label[lang]}
                      </span>
                      <span className="directory-item-address">
                        <Icon name="pin" size={12} />
                        {business.address}
                      </span>
                    </span>
                    <span className="directory-rating">
                      <Icon name="star" size={13} />
                      {business.rating.toFixed(1)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
