# ADR-0001 · El clima pasa por rutas propias del server

**Fecha:** 15/07/2026 (escrito el 15/11/2026, reconstruido desde `ac64bc4` y `4e5702f`) · **Estado:** aceptado · **Autora:** Malena

## Contexto
La página necesita el pronóstico de Open-Meteo y una decisión SÍ/NO. Se podía llamar a Open-Meteo directo
desde el navegador (acepta CORS y no pide clave) o pasar por una ruta propia.

## Decisión
**El navegador habla con `/api/weather` y `/api/geocode`, y esas rutas llaman a Open-Meteo y deciden en el server.**
La lógica de decisión (`src/lib/decision.ts`) corre en el server y la página solo muestra el resultado.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Llamar a Open-Meteo desde el navegador | La decisión y el armado de horas quedarían en el cliente; cada visitante le mostraría su IP a Open-Meteo; la CSP tendría que abrir más orígenes |

## Consecuencias
- Open-Meteo no ve la IP de quien visita (lo dice el README).
- Todas las llamadas salen de las IP de Vercel, así que la cuota gratis de Open-Meteo (por IP) se comparte. Lo mitiga el ADR-0005.
- La misma `decide()` sirve para la imagen OG (`src/app/opengraph-image.tsx`).

## Cómo se verifica
`src/app/api/weather/route.test.ts` y `src/app/api/geocode/route.test.ts`; CA-19 (la CSP no deja conectarse a Open-Meteo desde el navegador).
