import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import type { Lang, TranslationKey } from '../i18n';
import { CATEGORY_BY_ID } from '../businesses/categories';
import type { BusinessProfile } from '../businesses/data';
import { Icon } from './Icons';

interface Props {
  value: string;
  results: BusinessProfile[];
  onQuery(value: string): void;
  onPick(business: BusinessProfile): void;
  onFallback(): void;
  inputRef: RefObject<HTMLInputElement | null>;
  lang: Lang;
  t: (key: TranslationKey) => string;
}

/** Búsqueda con resultados en vivo, navegación por teclado y selección directa. */
export function BusinessSearch({ value, results, onQuery, onPick, onFallback, inputRef, lang, t }: Props) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | null>(null);
  const open = focused && value.trim().length > 0;

  useEffect(() => {
    setActive(0);
  }, [results]);

  useEffect(() => () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
  }, []);

  const pick = (business: BusinessProfile) => {
    onPick(business);
    setFocused(false);
    inputRef.current?.blur();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (results[active]) pick(results[active]);
    else onFallback();
  };

  return (
    <form className={`search ${focused ? 'is-focused' : ''}`} onSubmit={submit} role="search">
      <button type="button" className="search-icon" aria-hidden="true" tabIndex={-1}>
        <Icon name="search" size={18} />
      </button>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => {
          onQuery(event.target.value);
          setActive(0);
        }}
        onFocus={() => {
          if (blurTimer.current) window.clearTimeout(blurTimer.current);
          setFocused(true);
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setFocused(false), 150);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((index) => Math.min(results.length - 1, index + 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(0, index - 1));
          } else if (event.key === 'Escape') {
            onQuery('');
            setActive(0);
            inputRef.current?.blur();
          }
        }}
        placeholder={t('search.placeholder')}
        aria-label={t('search.aria')}
        autoComplete="off"
        enterKeyHint="search"
        className="search-input"
        role="combobox"
        aria-expanded={open}
        aria-controls="business-search-results"
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `search-result-${results[active].id}` : undefined}
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          onClick={() => {
            onQuery('');
            setActive(0);
            inputRef.current?.focus();
          }}
          aria-label={t('search.clear')}
        >
          <Icon name="close" size={16} />
        </button>
      )}

      {open && (
        <div className="search-results" id="business-search-results">
          {results.length === 0 ? (
            <div className="search-empty">{t('search.noResults')} «{value.trim()}»</div>
          ) : (
            <ul className="search-results-list no-scrollbar" role="listbox">
              {results.map((business, index) => {
                const category = CATEGORY_BY_ID[business.category];
                return (
                  <li key={business.id}>
                    <button
                      type="button"
                      id={`search-result-${business.id}`}
                      role="option"
                      aria-selected={index === active}
                      className={`search-result ${index === active ? 'is-active' : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(business)}
                      onMouseEnter={() => setActive(index)}
                    >
                      <span
                        className="search-result-icon"
                        aria-hidden="true"
                        style={{ backgroundColor: `${category.color}1f` }}
                      >
                        {category.emoji}
                      </span>
                      <span className="search-result-text">
                        <span className="search-result-name">{business.name}</span>
                        <span className="search-result-category">{category.label[lang]}</span>
                      </span>
                      {index === active && <Icon name="return" size={15} className="search-result-return" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="search-results-footer">{t('search.resultsDemo')}</div>
        </div>
      )}
    </form>
  );
}
