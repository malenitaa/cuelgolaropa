# ADR-0005 · Caché en la CDN para las rutas de Open-Meteo

**Fecha:** 15/11/2026 (actualizado el 21/11/2026, #19) · **Estado:** aceptado · **Autora:** Malena

## Contexto
Open-Meteo gratis permite 600 llamadas por minuto y 10.000 por día, por IP y aplicación. Todas las llamadas
salen de Vercel, y `/api/geocode` hacía hasta 5 llamadas por pedido sin caché ni rate limit (spike #8).
La auditoría del 15/11/2026 (M1) mostró que la caché de la CDN se esquivaba con un parámetro de más (`&z=1`)
o un decimal más, porque la clave es la URL entera.

## Decisión
**Dos capas de caché:**
1. **CDN:** las respuestas 200 llevan `Cache-Control: public, s-maxage=…` (1 día en `/api/geocode`, 10 minutos
   en `/api/weather`), y el 404 de `/api/geocode` 5 minutos. La página redondea las coordenadas a 2 decimales
   para que visitas cercanas compartan URL. Los 400 y 502 no se cachean.
2. **Caché de datos de Next** (`fetch` con `next: { revalidate }`, 10 minutos en el clima y 1 día en la
   búsqueda): la clave es la URL de Open-Meteo, que arma el server. `/api/weather` redondea lat/lon a 2
   decimales también del lado del server, así que un parámetro basura o un decimal de más le pega a la
   función, pero no genera otra llamada a Open-Meteo. Next solo guarda respuestas 200.

El rate limit por IP va como regla del Firewall de Vercel ("rate limit api"): `Request Path` empieza con `/api/`,
ventana fija de 60 s, 30 pedidos por IP, después 429. Es configuración, no código; Hobby permite una sola regla
de rate limit por proyecto y cuenta por región.

## Alternativas consideradas
| Alternativa | Por qué no |
|---|---|
| Rate limit en el código | Necesita estado (Upstash o similar); el Firewall de Vercel lo da sin código |
| Bajar de 5 a 3 las llamadas de `/api/geocode` | Empeora la búsqueda de nombres largos sin coma |
| Llamar a Open-Meteo desde el navegador | Ver ADR-0001 |

## Consecuencias
- El pronóstico que ves puede tener hasta 10 minutos.
- Open-Meteo recibe coordenadas con precisión de ~1 km, aunque alguien llame a la API directo con más decimales.
- Una ciudad que Open-Meteo suma tarda hasta un día en aparecer (la búsqueda vacía también se cachea).
- Textos al azar siguen generando llamadas nuevas (hasta 5 por búsqueda): eso lo frena el rate limit del Firewall.

## Cómo se verifica
CA-12, CA-16, CA-17, CA-28 y CA-29 en los tests de las rutas. Con `next build` + `next start` (21/11/2026),
tres pedidos a `/api/weather` con distintos decimales y `&z=` dejaron una sola entrada en `.next/cache/fetch-cache`,
y repetir un 404 de geocode no sumó entradas. En producción, `x-vercel-cache: MISS` y después `HIT` (15/11/2026);
35 pedidos seguidos a `/api/weather` desde una IP dieron 30 × 200 y 5 × 429 (21/11/2026).
