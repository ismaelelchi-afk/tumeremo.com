# TUMEREMO.COM

Mapa interactivo de **Tumeremo, Venezuela** con tres edificios comerciales 3D georreferenciados, fichas de negocios, categorías, búsqueda y directorio. La interfaz está disponible en **español** y **portugués (Brasil)**.

Repositorio público: <https://github.com/ismaelelchi-afk/tumeremo.com>

## Funcionalidades

- **Mapa vectorial real**: teselas de OpenFreeMap con datos de OpenStreetMap; desplazamiento, zoom, giro, inclinación y atribución.
- **Recorrido de apertura** y control para volver al centro de Tumeremo.
- **Controles de mapa**: tema día/noche, giro izquierda/derecha, acercar/alejar y regreso al centro.
- **Tres edificios comerciales 3D** sobre el mapa: Arepera El Guayabo, TecnoSelva Celulares y Boutique Orquídea. Se dibujan como una capa personalizada de Three.js sobre MapLibre; no son marcadores ni fuentes GeoJSON independientes.
- **Selección cinematográfica**: al tocar un edificio, un resultado o una entrada del directorio se enfoca el edificio con la cámara ya implementada y se abre su ficha; al cerrar, la cámara regresa a la vista anterior.
- **Indicador de selección** bajo el edificio activo, sin pines ni marcadores sobre la fachada.
- **Fichas comerciales**: fotografías del establecimiento, descripción, dirección, horario, contacto, etiquetas y catálogo. Los datos originales no publican productos ni promociones para estos tres comercios, y la ficha lo indica explícitamente.
- **Categorías reales**: Comida, Tecnología y Ropa, con conteos y filtrado de edificios/resultados.
- **Búsqueda en vivo**: localiza comercios por nombre, etiquetas, eslogán, descripción y dirección; ignora acentos y mayúsculas, permite varios términos y navegación con teclado.
- **Directorio**: panel lateral en escritorio y hoja inferior en móvil, sincronizado con la categoría y la búsqueda activas.
- **ES / PT-BR**: selector de idioma persistente para toda la interfaz.
- **Diseño responsive**: cabecera, controles, ficha y directorio se acomodan a teléfono y escritorio sin superponerse.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Interfaz | React 19 + TypeScript |
| Mapa | MapLibre GL JS 5.24.1 |
| Escena 3D | Three.js 0.187.0 como `CustomLayerInterface` |
| Estilos | CSS propio, sin framework de UI |
| Compilación | Vite 7 + `@vitejs/plugin-react` |
| Tipado | TypeScript 5.9 en modo estricto |
| Datos de mapa | OpenFreeMap / OpenStreetMap, sin claves de API |

## Arquitectura

```text
src/
├── App.tsx                 # Orquestación de overlays, filtros y selección
├── main.tsx                # Punto de entrada de React
├── i18n.ts                 # Diccionarios ES / PT-BR y persistencia del idioma
├── styles.css              # Sistema visual y layout responsive
├── map/
│   ├── style.ts            # Estilo vectorial de MapLibre y temas día/noche
│   └── useMap.ts           # Ciclo de vida del mapa, cámara y selección
├── businesses/
│   ├── data.ts             # Datos canónicos de los tres comercios
│   ├── categories.ts       # Categorías reales, normalización y filtros
│   ├── models.ts           # Modelos procedurales de los tres edificios
│   ├── modelTextures.ts    # Texturas canvas compartidas
│   ├── ThreeBusinessLayer.ts # Capa 3D, selección y atenuación por filtro
│   └── BusinessPanel.tsx   # Ficha comercial
└── ui/
    ├── BusinessSearch.tsx  # Búsqueda con resultados en vivo
    ├── CategoryBar.tsx     # Chips de categorías
    ├── Directory.tsx       # Directorio lateral / inferior
    └── Icons.tsx           # Iconos SVG y marca
```

Los edificios se derivan de coordenadas locales respecto a Plaza Bolívar y se transforman a coordenadas geográficas. La capa 3D compone su matriz en precisión doble para evitar vibración en zoom alto. El mapa base no se modifica: las construcciones visibles son únicamente esos tres modelos.

## Instalación y desarrollo

Requiere Node.js y npm.

```bash
npm install
npm run dev
```

La aplicación queda disponible en <http://localhost:5175>.

## Comprobaciones y compilación

```bash
npm run typecheck
npm run build
npm run preview
```

- `typecheck`: valida TypeScript en modo estricto.
- `build`: ejecuta el tipado y genera el bundle de producción en `dist/`.
- `preview`: sirve la compilación en <http://localhost:4175>.

## Origen de los datos

Los perfiles, fotografías, colores, dimensiones y recetas de los modelos se adaptaron del proyecto de referencia `tumeremo-3d`, analizado solo en lectura. Las posiciones originales se separaron conservando el promedio, la fila y la orientación para evitar solapamiento entre edificios.

Los establecimientos, teléfonos, correos y direcciones están declarados como **ficticios/de demostración** en los datos de origen. No se inventaron productos, precios, promociones ni categorías adicionales.

## Atribución

Teselas vectoriales de [OpenFreeMap](https://openfreemap.org) con datos de [OpenStreetMap](https://www.openstreetmap.org/copyright), © contribuidores de OpenStreetMap (ODbL). Las fotografías de establecimiento se sirven desde Pexels. No se requieren claves de API, pero sí conexión a internet para cargar teselas, fuentes e imágenes.
