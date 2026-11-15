# Seguridad

## Reportar un problema

Abrí un issue en <https://github.com/malenitaa/cuelgolaropa/issues>. El sitio no tiene cuentas ni
guarda datos de quien lo visita, así que un issue público alcanza. Si lo que encontraste expone a
quien visita el sitio (por ejemplo, su ubicación), escribí solo "tengo un problema de seguridad para
reportar en privado" y te contacto.

Incluí qué encontraste, cómo reproducirlo y en qué URL. Te contesto dentro de una semana.

## Versiones con soporte

Solo la versión que está en <https://cuelgolaropa.ar> (la rama `main`).

## Qué garantiza

Solo entra lo que tiene test o se verificó a mano en la auditoría.

| Garantía | Dónde | Test |
|---|---|---|
| El navegador solo puede conectarse al propio sitio y a BigDataCloud (`connect-src`); nadie puede meter el sitio en un iframe | `next.config.ts` | `src/next-config.test.ts` |
| La geolocalización solo la puede pedir el propio sitio | `next.config.ts` (Permissions-Policy) | `src/next-config.test.ts` |
| Open-Meteo recibe las coordenadas redondeadas a ~1 km | `src/app/page.tsx:roundCoord` | — (verificado a mano, 15/11/2026) |
| Open-Meteo no ve la IP de quien visita: lo llama el server | `src/app/api/*/route.ts` | `src/app/api/weather/route.test.ts`, `src/app/api/geocode/route.test.ts` |
| Las rutas solo llaman a hosts fijos de Open-Meteo, con los parámetros armados con `URLSearchParams` (no hay proxy abierto) | `src/app/api/*/route.ts` | `src/app/api/geocode/route.peor-caso.test.ts` |
| Coordenadas fuera de rango o ciudades de más de 200 caracteres se rechazan sin llamar afuera | `src/app/api/*/route.ts` | CA-10 y CA-13 en `docs/SPEC.md` |
| Una búsqueda hace a lo sumo 5 llamadas a Open-Meteo, cada una con timeout de 8 s | `src/app/api/geocode/route.ts` | `src/app/api/geocode/route.test.ts`, `route.peor-caso.test.ts` |
| Sin datos de humedad o viento, el sitio no responde SÍ | `src/app/api/weather/route.ts` | `src/app/api/weather/route.peor-caso.test.ts` |
| No hay cookies ni base de datos; en el navegador solo queda el idioma | `src/app/page.tsx` | — (verificado a mano, 15/11/2026) |
| Sin secretos en el historial de git | — | — (gitleaks, 15/11/2026) |
| Las dependencias de producción no tienen vulnerabilidades altas ni críticas conocidas | `.github/workflows/ci.yml`, `audit.yml` | `npm audit --omit=dev --audit-level=high` en cada PR, en cada push a `main` y todos los días |

## Qué no hace nunca

- No guarda tu ubicación ni la ciudad que escribís en una base de datos.
- No usa cookies, analítica ni publicidad.
- No le pasa tu ubicación a ningún tercero además de Open-Meteo y BigDataCloud (ver el README).

## Alcance y límites

- Los registros de acceso de Vercel (donde está alojado el sitio) tienen las URLs de los pedidos, con
  las coordenadas redondeadas o la ciudad, por el tiempo que Vercel los retenga.
- BigDataCloud recibe las coordenadas sin redondear y ve tu IP, porque sus términos piden que se lo
  llame desde el navegador.
- El sitio no tiene rate limit: alguien podría agotar la cuota gratuita de Open-Meteo y dejarlo sin
  responder un rato.

Detalle completo: [docs/AUDITORIA.md](docs/AUDITORIA.md).
