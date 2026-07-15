# ¿Cuelgo la ropa hoy?

Una sola pregunta, una sola respuesta gigante: **SÍ** o **NO** a colgar la ropa a secar hoy, según el clima de tu ubicación. Sin login, sin cuentas, sin configuración.

Inspirado en el estilo minimalista de [shouldideploy.today](https://shouldideploy.today/).

## Qué hace

1. Pide tu ubicación con la Geolocation API del navegador; si no la das o falla, pedís tu ciudad a mano.
2. Consulta el pronóstico horario en [Open-Meteo](https://open-meteo.com/) (API gratuita, sin API key).
3. Evalúa las próximas horas con reglas simples (si-entonces, no ML):
   - Ya está lloviendo/nevando ahora, o probabilidad de lluvia ≥ 30% → **rojo / NO**.
   - Viento > 50 km/h (vendaval/huracán) → **rojo / NO**, la ropa se puede volar.
   - Humedad ≥ 90% → **rojo / NO**, prácticamente no seca.
   - Humedad > 75%, o probabilidad de lluvia 15–29% → **amarillo / SÍ con cuidado**.
   - Resto de los casos → **verde / SÍ**.
4. Muestra el resultado bien grande con color, el motivo principal, mini-pronóstico de las próximas horas, y un toggle para ver los próximos 3 días.
5. Todo en español o inglés: detecta el idioma del navegador y tiene un toggle manual (ES/EN) que persiste en `localStorage`.

## Arquitectura

Next.js (App Router) + TypeScript + Tailwind CSS v4. Todo el estado vive en un único client component; no hay base de datos ni autenticación.

```
src/
├── app/
│   ├── page.tsx              # Toda la UI y el flujo de estados (locating → need-city → loading → result/error)
│   ├── layout.tsx            # Metadata, favicon estático de fallback, viewport
│   ├── globals.css           # Tailwind + fallback de --app-height
│   ├── robots.ts / sitemap.ts
│   └── api/
│       ├── weather/route.ts        # Llama a Open-Meteo forecast, corre decide(), devuelve JSON sin texto (solo claves)
│       ├── geocode/route.ts        # Ciudad → lat/lon (Open-Meteo geocoding), acepta ?lang=es|en
│       └── reverse-geocode/route.ts # lat/lon → nombre de ciudad (BigDataCloud, gratis sin API key)
└── lib/
    ├── decision.ts    # decide(): la lógica pura de SÍ/NO/color. Devuelve reasonKey + reasonValue, no texto
    ├── i18n.ts        # Diccionarios ES/EN: UI, REASONS (traduce reasonKey), ERRORS (traduce errorKey), letras de días
    ├── easterEggs.ts  # Ciudades ficticias (Tatooine, Hogwarts, Mordor, etc.) que devuelven un resultado canned sin pegarle a ninguna API
    └── weatherCodes.ts # Códigos WMO → emoji
```

**Por qué las rutas API no devuelven texto**: `decide()` devuelve una `reasonKey` (ej. `"humidHigh"`) y un `reasonValue` numérico, no un string armado en el servidor. Los textos reales viven todos en `src/lib/i18n.ts` y se arman en el cliente según el idioma activo. Esto permite que el toggle ES/EN sea instantáneo (sin refetch) para todo excepto el nombre de la ciudad, que sí se pide una vez en ambos idiomas en paralelo al buscar (`Promise.all`) y se cachea en memoria.

**Altura de pantalla en iOS Safari**: `min-h-dvh` puede quedar pegado a un valor viejo en páginas que nunca hacen scroll. `page.tsx` calcula `--app-height` con `window.visualViewport`/`innerHeight` y lo actualiza en cada resize; también sincroniza `<meta name="theme-color">` con el color de fondo actual para que la barra flotante de Safari no quede blanca sobre un resultado verde/rojo/amarillo.

**Easter eggs**: buscar "Tatooine", "Hogwarts", "Mordor", etc. corta el flujo antes de llamar a las APIs reales y devuelve un resultado fijo bilingüe (ver `findEasterEgg` en `easterEggs.ts`). "Zion"/"Matrix" es especial: todo el texto se muestra codificado en binario por defecto, y se decodifica pasando el mouse por encima (momentáneo) o con la barra espaciadora (toggle persistente).

## Correr local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Deploy

Se deploya gratis en [Vercel](https://vercel.com/new): importá el repo y confirmá, no necesita variables de entorno.
