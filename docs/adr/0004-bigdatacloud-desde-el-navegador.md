# ADR-0004 · El nombre del lugar se pide a BigDataCloud desde el navegador

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto
`/api/reverse-geocode` llamaba a `reverse-geocode-client` de BigDataCloud desde el server. Sus términos dicen
que ese endpoint gratis solo se puede llamar desde el cliente, con la ubicación actual del dispositivo, y
banean la IP con HTTP 402 si no (spike #8).

## Decisión
**La página llama a `api.bigdatacloud.net/data/reverse-geocode-client` directo y se borra `/api/reverse-geocode`; si no hay geolocalización, la ciudad por defecto usa el nombre fijo "Buenos Aires, Argentina".**

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Seguir en el server con la API con clave (`/data/reverse-geocode`, 50.000 gratis por mes) | Crear cuenta y cargar un secreto en Vercel para algo que los términos permiten gratis desde el cliente |
| Sacar el nombre del lugar | Es lo que le confirma a la persona que la respuesta es para donde está |

## Consecuencias
- BigDataCloud ve la IP de quien comparte su ubicación. El README lo dice (cambia la promesa de #7).
- La CSP abre `connect-src` a `https://api.bigdatacloud.net` (ADR-0003).
- Si BigDataCloud falla, la respuesta sale igual, sin el nombre.

## Cómo se verifica
CA-19 (`src/next-config.test.ts`); CA-20 verificado a mano el 15/11/2026 en producción; CA-21 sin verificar de punta a punta.
