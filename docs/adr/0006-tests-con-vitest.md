# ADR-0006 · Tests con vitest; `@types/node` sigue a la versión de Node

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto
El proyecto no tenía tests. Los criterios de la spec necesitaban una suite que corra en la CI.

## Decisión
**vitest 5.1 (`npm test`), con los tests al lado del código (`*.test.ts`) y `fetch` reemplazado con `vi.stubGlobal`; `@types/node` pasa de 20 a 24 para acompañar el Node donde corre el sitio.**
vitest 5 pide `@types/node` 22 o más, y Node 24 es el de la CI y el local. Dependabot no propone majors de `@types/node` (#18).

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| `node:test` | Sin alias `@/` ni mocks cómodos para `fetch`; vitest ya se usa en hayparo |
| Jest | Más configuración para TypeScript y ESM |

## Consecuencias
- La CI corre `npm test` en cada PR.
- No hay tests end-to-end de la página ni de integración contra Open-Meteo real: quedan como deuda.

## Cómo se verifica
`npm test` y el paso `npm test` en `.github/workflows/ci.yml`.
