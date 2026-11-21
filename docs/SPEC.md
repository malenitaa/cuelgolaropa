# ¿Cuelgo la ropa hoy? — especificación

**Estado:** vigente · **Última revisión:** 15/11/2026 · No hay un pedido original escrito: esta spec se
reconstruyó desde el código, el README y el historial de git. Lo deducido está marcado `[a confirmar]`.

## 1. Qué es y para quién

Un sitio de una sola pantalla que responde **SÍ** o **NO** a "¿cuelgo la ropa a secar ahora?" según el
clima de donde estás. Es para cualquier persona con un celular o una compu, sin cuentas ni configuración.
Está en producción en [cuelgolaropa.ar](https://cuelgolaropa.ar).

## 2. Qué hace

1. Pide tu ubicación al navegador y responde con una palabra gigante (SÍ/NO), un color (verde, amarillo,
   rojo) y el motivo.
2. Si no das la ubicación (o tarda más de 10 s), responde para Buenos Aires.
3. Te deja escribir una ciudad a mano ("Palermo, CABA", "Rosario").
4. Avisa si, aunque ahora se pueda, va a empeorar más tarde ("traé la ropa antes de las 17:00").
5. Muestra el pronóstico de las próximas 6 horas y, con la barra espaciadora o un toque, los próximos 3 días.
6. Está en español y en inglés; detecta el idioma del navegador y recuerda el que elegiste.
7. Cambia el favicon, el color de la barra del navegador y el título según el resultado.
8. Tiene algunas ciudades "de mentira" con respuesta propia (Melmac, Tatooine…).
9. Genera la imagen para compartir en redes (OG) con el clima de Buenos Aires, una vez por día.

## 3. Qué no hace (a propósito)

- **No guarda nada**: no hay base de datos, cuentas ni cookies. Solo el idioma queda en `localStorage`.
  Los registros de acceso de Vercel sí tienen las URLs de los pedidos (coordenadas redondeadas o ciudad).
- **No tiene publicidad ni analítica.**
- **No usa ML**: la decisión son reglas fijas (ver criterios). `[a confirmar]` que no se quiera ajustar
  por clima regional (los umbrales son los mismos en todo el mundo).
- **No pronostica a días**: la decisión es para ahora; los 3 días son solo informativos.

## 4. Principios no negociables

- **Privacidad**: la ubicación se usa en el momento y no se guarda. Cada tercero que la recibe está nombrado
  en el README (#7). Open-Meteo recibe coordenadas redondeadas a ~1 km.
- **Una pantalla, una respuesta**: nada que obligue a leer para saber si se puede.
- **Gratis y sin claves**: el sitio no necesita API keys ni cuentas en terceros.
- **Respetar los términos de los terceros**: BigDataCloud solo desde el navegador; Open-Meteo dentro de su
  plan gratuito no comercial (#8).

## 5. Criterios de aceptación

| # | Dado | Cuando | Entonces | Test |
|---|---|---|---|---|
| CA-1 | llueve ahora (código WMO de lluvia en `current`) | se decide | NO, rojo, "ya está lloviendo" | `src/lib/decision.test.ts` |
| CA-2 | nieva ahora | se decide | NO, rojo, "está nevando" (gana a la lluvia) | `src/lib/decision.test.ts` |
| CA-3 | `current` dice nublado pero el horario de esta hora dice lluvia | se decide | NO por lluvia | `src/lib/decision.test.ts` |
| CA-4 | viento de más de 50 km/h | se decide | NO, "viento peligroso" | `src/lib/decision.test.ts` |
| CA-5 | humedad de 90 % o más | se decide | NO, "humedad extrema (N %)" | `src/lib/decision.test.ts` |
| CA-6 | humedad entre 76 % y 89 %, sin lluvia | se decide | SÍ, amarillo, "humedad muy alta (N %)" | `src/lib/decision.test.ts` |
| CA-7 | seco, humedad ≤ 75 %, viento entre 5 y 30 km/h | se decide | SÍ, verde, "viento ideal" | `src/lib/decision.test.ts` |
| CA-8 | ahora se puede, pero en una hora siguiente llueve o la probabilidad es ≥ 30 % | se decide | SÍ, amarillo, con la hora en que empeora | `src/lib/decision.test.ts` |
| CA-9 | la humedad sube de noche pero no llueve | se decide | no avisa que empeora | `src/lib/decision.test.ts` |
| CA-10 | coordenadas faltantes o fuera de rango | se pide `/api/weather` | 400 con `errorKey` | `src/app/api/weather/route.test.ts` |
| CA-11 | Open-Meteo responde error o no responde | se pide `/api/weather` | 502 con `errorKey`, sin caché | `src/app/api/weather/route.test.ts` |
| CA-12 | Open-Meteo responde bien | se pide `/api/weather` | 200 con decisión, 6 horas siguientes (desde la hora que viene) y 3 días; `Cache-Control: public, s-maxage=600` | `src/app/api/weather/route.test.ts` |
| CA-13 | una ciudad vacía o de más de 200 caracteres | se pide `/api/geocode` | 400 | `src/app/api/geocode/route.test.ts` |
| CA-14 | "Palermo, CABA" o "Palermo CABA" | se pide `/api/geocode` | devuelve el Palermo de la Ciudad de Buenos Aires (con alias de CABA) | `src/app/api/geocode/route.test.ts` |
| CA-15 | una búsqueda sin coma de muchas palabras | se pide `/api/geocode` | a lo sumo 5 llamadas a Open-Meteo | `src/app/api/geocode/route.test.ts` |
| CA-16 | una ciudad que no existe | se pide `/api/geocode` | 404 `cityNotFound`, con `Cache-Control: public, s-maxage=300` (#19) | `src/app/api/geocode/route.test.ts` |
| CA-17 | una ciudad encontrada | se pide `/api/geocode` | 200 con `Cache-Control: public, s-maxage=86400` | `src/app/api/geocode/route.test.ts` |
| CA-18 | se escribe "Melmac" (con o sin mayúsculas o tildes) | se busca | respuesta propia, sin llamar a la red | `src/lib/easterEggs.test.ts` |
| CA-19 | cualquier página | se sirve | CSP con `connect-src 'self' https://api.bigdatacloud.net` y `frame-ancestors 'none'` | `src/next-config.test.ts` |
| CA-20 | el navegador no da la ubicación | se carga la página | responde para Buenos Aires con nombre fijo, sin llamar a BigDataCloud | — (verificado a mano el 15/11/2026) |
| CA-21 | el navegador da la ubicación | se carga la página | el nombre del lugar se pide a BigDataCloud desde el navegador | — (no verificado de punta a punta) |
| CA-22 | elegiste inglés | volvés a entrar | sigue en inglés | — |
| CA-23 | Open-Meteo responde 200 con otra forma (`null`, `{}`, `{error, reason}`, sin `current`) | se pide `/api/weather` | 502 `weatherServiceError`, nunca un 500 sin JSON | `src/app/api/weather/route.peor-caso.test.ts` |
| CA-24 | falta la humedad, el viento o el código de ahora | se pide `/api/weather` | 502 `insufficientData`: no responde SÍ con datos faltantes | `src/app/api/weather/route.peor-caso.test.ts` |
| CA-25 | se escribe "constructor", "__proto__" u otro nombre de `Object` | se busca un easter egg | no hay easter egg | `src/lib/easterEggs.peor-caso.test.ts` |
| CA-26 | Open-Meteo devuelve resultados sin coordenadas o `null` | se pide `/api/geocode` | se saltean; nunca 200 sin `latitude`/`longitude` | `src/app/api/geocode/route.peor-caso.test.ts` |
| CA-27 | se muestra un resultado | en `es` o `en` | al pie, "Según/Based on Open-Meteo.com · CC BY 4.0" con link a `open-meteo.com` y a la licencia (#12) | — (verificado a mano el 20/11/2026) |
| CA-28 | coordenadas con más de 2 decimales o un parámetro de más | se pide `/api/weather` | Open-Meteo se llama con lat/lon redondeadas a 2 decimales y `next: { revalidate: 600 }`: la misma URL que sin el ruido (#19) | `src/app/api/weather/route.test.ts` |
| CA-29 | cualquier búsqueda | se pide `/api/geocode` | Open-Meteo se llama con `next: { revalidate: 86400 }` (#19) | `src/app/api/geocode/route.test.ts` |

## 6. Casos borde y errores

- **Sin red** en el navegador: pantalla de error "no se pudo conectar" y botón para probar otra ciudad.
- **Open-Meteo caído**: 502 y mensaje "no se pudo contactar al servicio de clima".
- **BigDataCloud caído o nos banea**: la respuesta sale igual, sin el nombre del lugar.
- **Ciudad ambigua**: se toma el primer resultado de Open-Meteo que coincide con el calificador.
- **Respuesta del API sin `errorKey` o que no es JSON** (por ejemplo un 504 de Vercel): se muestra el error de red.

## 7. Fuera de alcance por ahora

- Rate limit en el código: va como regla del Firewall de Vercel sobre `/api/*` (#19).
- Umbrales por región o por tipo de ropa.
