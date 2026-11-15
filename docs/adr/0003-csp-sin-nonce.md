# ADR-0003 · CSP en `next.config.ts`, sin nonce

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto
El sitio no tenía Content Security Policy (#9). Next mete scripts inline (el payload de RSC), así que una CSP
estricta necesita nonce, y con nonce cada visita se renderiza en el server.

## Decisión
**La CSP va como header fijo en `next.config.ts`, con `script-src 'self' 'unsafe-inline'` y el resto cerrado.**
`connect-src 'self' https://api.bigdatacloud.net`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
`frame-ancestors 'none'`, `img-src` con `data:` por el favicon de emoji, y `'unsafe-eval'` solo en desarrollo.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Nonce con `src/proxy.ts` (como hayparo) | La home dejaría de ser estática y la CDN no la cachearía; el sitio no muestra HTML de terceros ni de usuarios |
| SRI experimental de Next | No cubre los scripts inline de Next; sigue haciendo falta `'unsafe-inline'` |

## Consecuencias
- Un XSS inyectado en el HTML podría correr script inline. `connect-src` le impide usar `fetch` hacia otro origen, pero no frena que navegue la página entera (`location = "https://…?d=…"`), así que no es una barrera para sacar datos. Hoy no hay dónde inyectar: React escapa todo y el JSON-LD dinámico usa `textContent` (auditoría del 15/11/2026, L4).
- El toolbar de Vercel en los previews queda bloqueado (en producción no aparece).
- Si algún día se muestra contenido de terceros como HTML, hay que pasar a nonce.

## Cómo se verifica
`src/next-config.test.ts` (CA-19) y `curl -sI https://cuelgolaropa.ar/ | grep -i content-security`.
