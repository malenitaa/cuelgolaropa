# ADR-0005 · Caché en la CDN para las rutas de Open-Meteo

**Fecha:** 15/11/2026 · **Estado:** aceptado · **Autora:** Malena

## Contexto
Open-Meteo gratis permite 600 llamadas por minuto y 10.000 por día, por IP y aplicación. Todas las llamadas
salen de Vercel, y `/api/geocode` hacía hasta 5 llamadas por pedido sin caché ni rate limit (spike #8).

## Decisión
**Las respuestas 200 llevan `Cache-Control: public, s-maxage=…` (1 día en `/api/geocode`, 10 minutos en `/api/weather`) y la página redondea las coordenadas a 2 decimales para que visitas cercanas compartan URL.**
Los errores no se cachean.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Rate limit | Necesita estado (Upstash o Firewall de Vercel); se retoma si aparece abuso |
| Bajar de 5 a 3 las llamadas de `/api/geocode` | Empeora la búsqueda de nombres largos sin coma |
| Llamar a Open-Meteo desde el navegador | Ver ADR-0001 |

## Consecuencias
- El pronóstico que ves puede tener hasta 10 minutos.
- Open-Meteo recibe coordenadas con precisión de ~1 km.
- Las búsquedas de textos al azar no pegan en la caché, y la clave de caché es la URL entera: un parámetro de más (`&z=1`) o un decimal más también la esquivan. El abuso sigue siendo posible (auditoría del 15/11/2026, M1; #19).

## Cómo se verifica
CA-12 y CA-17 en los tests de las rutas; en producción, `x-vercel-cache: MISS` y después `HIT` (verificado el 15/11/2026).
