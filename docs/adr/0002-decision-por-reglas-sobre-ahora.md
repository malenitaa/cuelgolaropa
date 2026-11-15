# ADR-0002 · La decisión sale de la lectura de "ahora", con reglas fijas

**Fecha:** 25/07/2026 (escrito el 15/11/2026, reconstruido desde #2, #3, #4 y `40b2bac` del 01/08/2026) · **Estado:** aceptado · **Autora:** Malena

## Contexto
La primera versión promediaba 8 horas de pronóstico. Pasaba que afuera había sol y viento y el sitio decía
NO por un dato de pronóstico de más tarde. Además, el `current` de Open-Meteo a veces dice "nublado" cuando el
horario de esa misma hora ya marca llovizna.

## Decisión
**El SÍ/NO y el color salen de `current` (la lectura real de ahora) con reglas if/then; el pronóstico horario solo sirve para avisar a qué hora empeora.**
- NO (rojo): lluvia o nieve ahora (en `current` o en el horario de esta hora), viento de más de 50 km/h, o humedad de 90 % o más.
- SÍ amarillo: humedad de más de 75 %, o empeora más tarde.
- SÍ verde: el resto.
- "Empeora más tarde" es lluvia, nieve, viento peligroso o probabilidad de lluvia de 30 % o más en las 8 horas siguientes. La humedad nocturna no cuenta (#6).

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Promedio de 8 horas | Contradecía lo que se ve por la ventana (#2) |
| Ventana de 3 horas | Mismo problema, más chico (#3) |
| Un modelo entrenado | No hay datos de "se secó / no se secó"; las reglas se explican en una línea |

## Consecuencias
- Los umbrales son iguales en todo el mundo (en la spec, `[a confirmar]`).
- La decisión es reproducible y testeable sin red.

## Cómo se verifica
`src/lib/decision.test.ts` (CA-1 a CA-9).
