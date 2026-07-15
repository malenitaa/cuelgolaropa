# ¿Cuelgo la ropa hoy?

Una sola pregunta, una sola respuesta gigante: **SÍ** o **NO** a colgar la ropa a secar hoy, según el clima de tu ubicación. Sin login, sin cuentas, sin configuración.

Inspirado en el estilo minimalista de [shouldideploy.today](https://shouldideploy.today/).

## Qué hace

1. Pide tu ubicación con la Geolocation API del navegador (si no la das o falla, pedís tu ciudad a mano).
2. Consulta el pronóstico horario en [Open-Meteo](https://open-meteo.com/) (API gratuita, sin API key).
3. Evalúa las próximas 6-8 horas de luz solar con reglas simples:
   - Probabilidad de lluvia ≥ 30% → penaliza fuerte.
   - Humedad relativa alta (> 75%, o > 60% moderado) → penaliza.
   - Viento moderado (5-30 km/h) suma puntos; casi nulo o demasiado fuerte resta.
   - Si ya se puso el sol o todavía no amaneció, la respuesta es directamente NO.
4. Muestra SÍ (verde) o NO (rojo) bien grande, con el motivo principal y un mini-pronóstico de las próximas horas.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS. Todo corre en el cliente; dos route handlers (`/api/geocode` y `/api/weather`) llaman a Open-Meteo del lado del servidor. Sin base de datos, sin autenticación.

## Correr local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Deploy

Este proyecto se deploya gratis en [Vercel](https://vercel.com/new): importá el repo y confirmá, no necesita variables de entorno.
