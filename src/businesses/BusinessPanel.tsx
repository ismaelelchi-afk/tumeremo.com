import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useI18n } from '../i18n';
import { Icon, type IconName } from '../ui/Icons';
import type { BusinessProfile, CatalogEntry } from './data';

interface Props {
  profile: BusinessProfile;
  onClose(): void;
  onCenter(): void;
}

function telLink(value: string): string {
  const clean = value.replace(/[^\d+]/g, '');
  return clean ? `tel:${clean}` : '';
}

function whatsappLink(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

function instagramLink(value: string): string {
  const handle = value.replace(/^@+/, '').trim();
  return handle ? `https://instagram.com/${handle}` : '';
}

function mailLink(value: string): string {
  return value ? `mailto:${value}` : '';
}

/** Ficha del edificio seleccionado: fotografías, datos y catálogo originales. */
export function BusinessPanel({ profile, onClose, onCenter }: Props) {
  const { lang, t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    setExpanded(false);
  }, [profile.id]);

  const onHandleDown = (event: ReactPointerEvent) => {
    dragStart.current = event.clientY;
  };

  const onHandleUp = (event: ReactPointerEvent) => {
    if (dragStart.current === null) return;
    const dy = event.clientY - dragStart.current;
    dragStart.current = null;
    if (Math.abs(dy) < 8) {
      setExpanded((v) => !v);
    } else if (dy < -30) {
      setExpanded(true);
    } else if (dy > 30) {
      if (expanded) setExpanded(false);
      else onClose();
    }
  };

  const actions: Array<{ icon: IconName; label: string; href: string; tone?: string }> = [
    { icon: 'phone', label: t('shop.call'), href: telLink(profile.contact.phone) },
    { icon: 'whatsapp', label: t('shop.whatsapp'), href: whatsappLink(profile.contact.whatsapp), tone: 'green' },
    { icon: 'instagram', label: t('shop.instagram'), href: instagramLink(profile.contact.instagram) },
    { icon: 'mail', label: t('shop.email'), href: mailLink(profile.contact.email) },
  ];

  return (
    <section className={`biz-panel ${expanded ? 'is-expanded' : ''}`} aria-label={`${t('shop.official')}: ${profile.name}`}>
      <div
        className="biz-handle"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? t('shop.collapse') : t('shop.expand')}
        onPointerDown={onHandleDown}
        onPointerUp={onHandleUp}
        onPointerCancel={() => { dragStart.current = null; }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <span className="biz-handle-bar" />
        <span className="biz-handle-hint">
          <Icon name="chevronUp" size={12} /> {t('shop.dragHint')}
        </span>
      </div>

      <div className="biz-scroll">
        <Carousel profile={profile} onClose={onClose} />

        <div className="biz-body">
          <div className="biz-badges">
            <span className="biz-category" style={{ backgroundColor: profile.accent }}>
              <span aria-hidden="true">{profile.emoji}</span> {profile.categoryLabel[lang]}
            </span>
            <span className="biz-official">{t('shop.official')}</span>
          </div>

          <h2 className="biz-name">{profile.name}</h2>
          {profile.slogan && <p className="biz-slogan">{profile.slogan}</p>}

          <div className="biz-rating" aria-label={`${t('shop.rating')}: ${profile.rating.toFixed(1)}`}>
            <span aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={i < Math.round(profile.rating) ? 'is-filled' : ''}>★</span>
              ))}
            </span>
            <strong>{profile.rating.toFixed(1)}</strong>
          </div>

          <div className="biz-actions">
            {actions.map((action) => (
              <Action key={action.label} {...action} />
            ))}
          </div>

          <p className="biz-description">{profile.description}</p>

          <div className="biz-tags">
            {profile.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <Catalog profile={profile} />

          <dl className="biz-info">
            <InfoRow icon="pin" label={t('shop.address')} value={profile.address} />
            <InfoRow icon="clock" label={t('shop.hours')} value={profile.hours} />
            <InfoRow icon="phone" label={t('shop.call')} value={profile.contact.phone} href={telLink(profile.contact.phone)} />
            <InfoRow icon="whatsapp" label={t('shop.whatsapp')} value={profile.contact.whatsapp} href={whatsappLink(profile.contact.whatsapp)} />
            <InfoRow icon="instagram" label={t('shop.instagram')} value={profile.contact.instagram} href={instagramLink(profile.contact.instagram)} />
            <InfoRow icon="mail" label={t('shop.email')} value={profile.contact.email} href={mailLink(profile.contact.email)} />
          </dl>

          <div className="biz-notice">
            <Icon name="info" size={16} />
            <span>{t('shop.demoNotice')}</span>
          </div>
        </div>
      </div>

      <div className="biz-footer">
        <button type="button" onClick={onCenter}>
          <Icon name="locate" size={16} /> {t('shop.center')}
        </button>
        <button type="button" className="is-primary" onClick={onClose}>
          <Icon name="back" size={16} /> {t('shop.back')}
        </button>
      </div>
    </section>
  );
}

function Carousel({ profile, onClose }: { profile: BusinessProfile; onClose(): void }) {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    scroller.current?.scrollTo({ left: 0 });
    setIndex(0);
    setFailed({});
    setLoaded({});
  }, [profile.photos]);

  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(profile.photos.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="biz-carousel" aria-label={t('shop.photos')}>
      <div
        ref={scroller}
        className="biz-photos"
        onScroll={(event) => {
          const el = event.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {profile.photos.map((src, i) => (
          <div key={`${src}-${i}`} className="biz-photo">
            {!loaded[i] && !failed[i] && <span className="biz-photo-loading" />}
            {failed[i] ? (
              <span className="biz-photo-fallback">
                <span aria-hidden="true">{profile.emoji}</span>
                <small>{t('shop.photoUnavailable')}</small>
              </span>
            ) : (
              <img
                src={src}
                alt={`${profile.name} — ${t('shop.photo')} ${i + 1} ${t('shop.of')} ${profile.photos.length}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
                onLoad={() => setLoaded((v) => ({ ...v, [i]: true }))}
                onError={() => setFailed((v) => ({ ...v, [i]: true }))}
                className={loaded[i] ? 'is-loaded' : ''}
              />
            )}
          </div>
        ))}
      </div>

      <div className="biz-carousel-top">
        <span className="biz-photo-badge">{t('shop.photos')}</span>
        <button type="button" className="biz-close" onClick={onClose} aria-label={t('shop.close')}>
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="biz-dots">
        {profile.photos.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`${t('shop.photo')} ${i + 1} ${t('shop.of')} ${profile.photos.length}`}
            className={i === index ? 'is-active' : ''}
          />
        ))}
      </div>

      {profile.photos.length > 1 && (
        <>
          <button type="button" className="biz-arrow is-left" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t('shop.photo')}>
            <Icon name="chevronLeft" size={16} />
          </button>
          <button type="button" className="biz-arrow is-right" onClick={() => go(index + 1)} disabled={index === profile.photos.length - 1} aria-label={t('shop.photo')}>
            <Icon name="chevronRight" size={16} />
          </button>
        </>
      )}
    </div>
  );
}

/** Los datos originales no publican catálogo: se muestra ese hecho, sin inventarlo. */
function Catalog({ profile }: { profile: BusinessProfile }) {
  const { t } = useI18n();
  const promotions = profile.promotions;
  const products = profile.products;

  return (
    <section className="biz-catalog">
      <p className="biz-section-title">{t('shop.showcase')}</p>
      {promotions.length > 0 && <Entries entries={promotions} tone="amber" title={t('shop.promotions')} />}
      {products.length > 0 && <Entries entries={products} tone="plain" title={t('shop.products')} />}
      {promotions.length === 0 && products.length === 0 && (
        <div className="biz-empty">
          <Icon name="store" size={22} />
          <p>{t('shop.emptyCatalog')}</p>
        </div>
      )}
    </section>
  );
}

function Entries({ entries, tone, title }: { entries: CatalogEntry[]; tone: 'amber' | 'plain'; title: string }) {
  return (
    <div className={`biz-entries is-${tone}`}>
      <p className="biz-entries-title">{title}</p>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            {entry.image && <img src={entry.image} alt="" loading="lazy" />}
            <div>
              <strong>{entry.name}</strong>
              {entry.description && <span>{entry.description}</span>}
              {entry.badge && <small>{entry.badge}</small>}
            </div>
            {entry.price && <b>{entry.price}</b>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoRow({ icon, label, value, href }: { icon: IconName; label: string; value: string; href?: string }) {
  return (
    <div className="biz-info-row">
      <span className="biz-info-icon"><Icon name={icon} size={16} /></span>
      <div>
        <dt>{label}</dt>
        <dd>
          {href ? (
            <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>
              {value}
            </a>
          ) : (
            value
          )}
        </dd>
      </div>
    </div>
  );
}

function Action({ icon, label, href, tone }: { icon: IconName; label: string; href: string; tone?: string }) {
  const className = `biz-action ${tone ?? ''}`.trim();
  const content = (
    <>
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </>
  );
  if (href) {
    return (
      <a className={className} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>
        {content}
      </a>
    );
  }
  return <button type="button" className={className}>{content}</button>;
}
