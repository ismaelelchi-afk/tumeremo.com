import { useEffect, useState } from 'react';

export type Lang = 'es' | 'pt-BR';

const STRINGS = {
  es: {
    'app.title': 'TUMEREMO WORLD',
    'app.description': 'TUMEREMO WORLD — el mapa interactivo de Tumeremo, Venezuela.',
    'lang.label': 'Idioma de la interfaz',
    'lang.es': 'ES',
    'lang.ptBR': 'PT-BR',
    'lang.name.es': 'Español',
    'lang.name.ptBR': 'Português (Brasil)',
    'search.placeholder': 'Buscar comercio, producto o servicio…',
    'search.aria': 'Buscar comercios por nombre',
    'search.clear': 'Limpiar búsqueda',
    'search.invalid': 'Coordenadas no válidas. Usa latitud, longitud.',
    'search.noResults': 'No encontramos comercios con',
    'search.resultsDemo': 'Resultados de demostración · negocios ficticios',
    'category.aria': 'Filtrar por categoría',
    'category.all': 'Todos',
    'directory.aria': 'Directorio comercial',
    'directory.title': 'Directorio comercial',
    'directory.resultsFor': 'Resultados para',
    'directory.close': 'Cerrar directorio',
    'directory.open': 'Ver directorio',
    'directory.one': 'establecimiento',
    'directory.many': 'establecimientos',
    'directory.demo': 'ejemplos ficticios',
    'directory.empty': 'No hay comercios que correspondan a tu búsqueda o categoría.',
    'directory.clear': 'Limpiar filtros',
    'control.themeToDay': 'Cambiar al modo día',
    'control.themeToNight': 'Cambiar al modo noche',
    'control.rotateLeft': 'Girar a la izquierda',
    'control.rotateRight': 'Girar a la derecha',
    'control.zoomIn': 'Acercar',
    'control.zoomOut': 'Alejar',
    'control.home': 'Volver al centro de Tumeremo',
    'common.loadingMap': 'CARGANDO MAPA',
    'world.mapError': 'No se pudo cargar parte del mapa. Revisa tu conexión.',
    'shop.close': 'Cerrar ficha',
    'shop.expand': 'Expandir ficha',
    'shop.collapse': 'Contraer ficha',
    'shop.dragHint': 'Desliza o toca para expandir',
    'shop.photos': 'Fotos del establecimiento',
    'shop.photo': 'Foto',
    'shop.of': 'de',
    'shop.photoUnavailable': 'Foto no disponible',
    'shop.official': 'Comercio destacado',
    'shop.rating': 'Valoración',
    'shop.call': 'Llamar',
    'shop.whatsapp': 'WhatsApp',
    'shop.instagram': 'Instagram',
    'shop.email': 'Correo',
    'shop.address': 'Dirección',
    'shop.hours': 'Horario',
    'shop.showcase': 'Catálogo',
    'shop.emptyCatalog': 'Este comercio no tiene catálogo publicado en los datos originales.',
    'shop.products': 'Productos y servicios',
    'shop.promotions': 'Promociones',
    'shop.demoNotice': 'Datos de demostración: los establecimientos, teléfonos y direcciones son ficticios.',
    'shop.center': 'Centrar edificio',
    'shop.back': 'Volver al mapa',
  },
  'pt-BR': {
    'app.title': 'TUMEREMO WORLD',
    'app.description': 'TUMEREMO WORLD — o mapa interativo de Tumeremo, Venezuela.',
    'lang.label': 'Idioma da interface',
    'lang.es': 'ES',
    'lang.ptBR': 'PT-BR',
    'lang.name.es': 'Español',
    'lang.name.ptBR': 'Português (Brasil)',
    'search.placeholder': 'Buscar negócio, produto ou serviço…',
    'search.aria': 'Buscar estabelecimentos por nome',
    'search.clear': 'Limpar busca',
    'search.invalid': 'Coordenadas inválidas. Use latitude, longitude.',
    'search.noResults': 'Não encontramos negócios com',
    'search.resultsDemo': 'Resultados de demonstração · negócios fictícios',
    'category.aria': 'Filtrar por categoria',
    'category.all': 'Todos',
    'directory.aria': 'Diretório comercial',
    'directory.title': 'Diretório comercial',
    'directory.resultsFor': 'Resultados para',
    'directory.close': 'Fechar diretório',
    'directory.open': 'Ver diretório',
    'directory.one': 'estabelecimento',
    'directory.many': 'estabelecimentos',
    'directory.demo': 'exemplos fictícios',
    'directory.empty': 'Não há negócios que correspondam à sua busca ou categoria.',
    'directory.clear': 'Limpar filtros',
    'control.themeToDay': 'Mudar para o modo dia',
    'control.themeToNight': 'Mudar para o modo noite',
    'control.rotateLeft': 'Girar à esquerda',
    'control.rotateRight': 'Girar à direita',
    'control.zoomIn': 'Aproximar',
    'control.zoomOut': 'Afastar',
    'control.home': 'Voltar ao centro de Tumeremo',
    'common.loadingMap': 'CARREGANDO MAPA',
    'world.mapError': 'Não foi possível carregar parte do mapa. Verifique sua conexão.',
    'shop.close': 'Fechar ficha',
    'shop.expand': 'Expandir ficha',
    'shop.collapse': 'Recolher ficha',
    'shop.dragHint': 'Deslize ou toque para expandir',
    'shop.photos': 'Fotos do estabelecimento',
    'shop.photo': 'Foto',
    'shop.of': 'de',
    'shop.photoUnavailable': 'Foto indisponível',
    'shop.official': 'Comércio em destaque',
    'shop.rating': 'Avaliação',
    'shop.call': 'Ligar',
    'shop.whatsapp': 'WhatsApp',
    'shop.instagram': 'Instagram',
    'shop.email': 'E-mail',
    'shop.address': 'Endereço',
    'shop.hours': 'Horário',
    'shop.showcase': 'Catálogo',
    'shop.emptyCatalog': 'Este comércio não tem catálogo publicado nos dados originais.',
    'shop.products': 'Produtos e serviços',
    'shop.promotions': 'Promoções',
    'shop.demoNotice': 'Dados de demonstração: os estabelecimentos, telefones e endereços são fictícios.',
    'shop.center': 'Centralizar edifício',
    'shop.back': 'Voltar ao mapa',
  },
} as const;

export type TranslationKey = keyof (typeof STRINGS)['es'];
const KEY = 'tumeremo-world:lang';

function readLang(): Lang {
  const saved = localStorage.getItem(KEY);
  return saved === 'pt-BR' ? 'pt-BR' : 'es';
}

export function useI18n() {
  const [lang, setLangState] = useState<Lang>(readLang);

  useEffect(() => {
    document.documentElement.lang = lang === 'es' ? 'es' : 'pt-BR';
    document.title = STRINGS[lang]['app.title'];
    document.querySelector('meta[name="description"]')?.setAttribute('content', STRINGS[lang]['app.description']);
  }, [lang]);

  const setLang = (next: Lang) => {
    localStorage.setItem(KEY, next);
    setLangState(next);
  };

  const t = (key: TranslationKey): string => STRINGS[lang][key];
  return { lang, setLang, t };
}
