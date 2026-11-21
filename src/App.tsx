import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BusinessPanel } from './businesses/BusinessPanel';
import { BUSINESSES, getBusiness, type BusinessProfile } from './businesses/data';
import {
  CATEGORY_BY_ID,
  filterBusinesses,
  type BusinessCategoryId,
} from './businesses/categories';
import { useI18n } from './i18n';
import { useMap } from './map/useMap';
import { BusinessSearch } from './ui/BusinessSearch';
import { CategoryBar } from './ui/CategoryBar';
import { Directory } from './ui/Directory';
import { Icon, LogoMark } from './ui/Icons';

function parseCoordinates(text: string): [number, number] | null {
  const parts = text.trim().split(/[\s,;]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = Number(parts[0].replace(',', '.'));
  const lng = Number(parts[1].replace(',', '.'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

export default function App() {
  const { lang, setLang, t } = useI18n();
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<BusinessCategoryId | 'todos'>('todos');
  const [headerH, setHeaderH] = useState(132);
  const [controlsH, setControlsH] = useState(288);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [directoryOpen, setDirectoryOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const headerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | null>(null);

  const filtered = useMemo(() => filterBusinesses(BUSINESSES, category, query), [category, query]);
  const filterActive = category !== 'todos' || query.trim() !== '';

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3200);
  };

  const {
    containerRef,
    ready,
    theme,
    setTheme,
    actions,
    selectedBuildingId,
    selectBuilding,
  } = useMap(() => showToast(t('world.mapError')));
  const selectedBusiness = getBusiness(selectedBuildingId);

  /**
   * La ficha no se sitúa sobre la interfaz: reserva el espacio que queda libre
   * entre la cabecera, los controles y el borde seguro inferior. El criterio es
   * el mismo de Tumeremo Plan: medir los overlays y alimentar variables CSS.
   */
  const layoutVars = {
    '--header-h': `${headerH}px`,
    '--controls-h': `${controlsH}px`,
    '--sheet-top': 'calc(var(--header-h) + 12px + var(--controls-h) + 8px)',
  } as CSSProperties;

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeaderH(el.getBoundingClientRect().height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setControlsH(el.getBoundingClientRect().height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    actions.setBusinessFilter(filterActive ? filtered.map((business) => business.id) : null);
  }, [actions, filterActive, filtered]);

  useEffect(() => {
    if (selectedBuildingId && !isDesktop) setDirectoryOpen(false);
  }, [selectedBuildingId, isDesktop]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (!selectedBuildingId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target instanceof HTMLInputElement)) selectBuilding(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedBuildingId, selectBuilding]);

  const pickBusiness = useCallback((business: BusinessProfile) => {
    setQuery('');
    selectBuilding(business.id);
  }, [selectBuilding]);

  const submitCoordinates = () => {
    const coords = parseCoordinates(query);
    if (!coords) {
      showToast(t('search.invalid'));
      return;
    }
    actions.goTo(coords[0], coords[1]);
    setQuery('');
    inputRef.current?.blur();
  };

  const changeCategory = (next: BusinessCategoryId | 'todos') => {
    const resolved = next === category && next !== 'todos' ? 'todos' : next;
    setCategory(resolved);
    const list = filterBusinesses(BUSINESSES, resolved, query);
    if (selectedBuildingId && !list.some((business) => business.id === selectedBuildingId)) {
      selectBuilding(null);
    }
    if (resolved !== 'todos') setDirectoryOpen(true);
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('todos');
    setDirectoryOpen(true);
  };

  const directoryTitle = category === 'todos'
    ? query.trim()
      ? `${t('directory.resultsFor')} «${query.trim()}»`
      : t('directory.title')
    : CATEGORY_BY_ID[category].label[lang];

  return (
    <div className="app-root" style={layoutVars}>
      <div ref={containerRef} className="map-canvas" />

      <div ref={headerRef} className="app-header">
        <div className="header-row">
          <div className="brand-box">
            <div className="brand" aria-label="TUMEREMO WORLD">
              <LogoMark size={26} />
              <span className="brand-text">
                <span className="brand-name">TUMEREMO</span>
                <span className="brand-sub">WORLD</span>
              </span>
            </div>
          </div>

          <BusinessSearch
            value={query}
            results={filtered.slice(0, 6)}
            onQuery={setQuery}
            onPick={pickBusiness}
            onFallback={submitCoordinates}
            inputRef={inputRef}
            lang={lang}
            t={t}
          />

          <div className="header-right">
            <div className="language glass" role="group" aria-label={t('lang.label')}>
              <button
                type="button"
                aria-pressed={lang === 'es'}
                title={t('lang.name.es')}
                className={lang === 'es' ? 'active' : ''}
                onClick={() => setLang('es')}
              >
                {t('lang.es')}
              </button>
              <button
                type="button"
                aria-pressed={lang === 'pt-BR'}
                title={t('lang.name.ptBR')}
                className={lang === 'pt-BR' ? 'active' : ''}
                onClick={() => setLang('pt-BR')}
              >
                {t('lang.ptBR')}
              </button>
            </div>
          </div>
        </div>

        <CategoryBar
          value={category}
          onChange={changeCategory}
          businesses={BUSINESSES}
          lang={lang}
          allLabel={t('category.all')}
          ariaLabel={t('category.aria')}
        />
      </div>

      <div
        ref={controlsRef}
        className={`map-controls ${selectedBusiness ? 'is-sheet-open' : ''}`}
        style={{ top: headerH + 12 }}
      >
        <Group>
          <Button
            label={theme === 'noite' ? t('control.themeToDay') : t('control.themeToNight')}
            onClick={() => setTheme(theme === 'noite' ? 'dia' : 'noite')}
          >
            <Icon name={theme === 'noite' ? 'sun' : 'moon'} size={18} className={theme === 'noite' ? 'gold' : ''} />
          </Button>
        </Group>
        <Group>
          <Button label={t('control.rotateLeft')} onClick={actions.rotateLeft}>
            <Icon name="undo" size={18} />
          </Button>
          <Button label={t('control.rotateRight')} onClick={actions.rotateRight}>
            <Icon name="redo" size={18} />
          </Button>
        </Group>
        <Group>
          <Button label={t('control.zoomIn')} onClick={actions.zoomIn}>
            <Icon name="plus" size={20} />
          </Button>
          <Button label={t('control.zoomOut')} onClick={actions.zoomOut}>
            <span className="minus-line" aria-hidden="true" />
          </Button>
        </Group>
        <Group>
          <Button label={t('control.home')} onClick={actions.goHome}>
            <Icon name="home" size={18} />
          </Button>
        </Group>
      </div>

      {directoryOpen && (!selectedBusiness || isDesktop) && (
        <Directory
          items={filtered}
          selectedId={selectedBuildingId}
          title={directoryTitle}
          lang={lang}
          onPick={pickBusiness}
          onClose={() => setDirectoryOpen(false)}
          onClearFilters={clearFilters}
          t={t}
        />
      )}

      {!directoryOpen && (!selectedBusiness || isDesktop) && (
        <button type="button" className="directory-fab" onClick={() => setDirectoryOpen(true)}>
          <Icon name="list" size={16} />
          <span>{t('directory.open')}</span>
          <span className="directory-fab-count">{filtered.length}</span>
        </button>
      )}

      {selectedBusiness && (
        <div className="biz-area">
          <BusinessPanel
            profile={selectedBusiness}
            onClose={() => selectBuilding(null)}
            onCenter={() => actions.focusBuilding(selectedBusiness.id)}
          />
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

      {!ready && (
        <div className="loading fade">
          <LogoMark size={52} />
          <span className="loading-text">{t('common.loadingMap')}</span>
        </div>
      )}
    </div>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className="control-group">{children}</div>;
}

function Button({ label, onClick, children }: { label: string; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="control-button">
      {children}
    </button>
  );
}
