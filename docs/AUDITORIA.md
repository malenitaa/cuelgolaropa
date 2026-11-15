# Auditoría de seguridad y privacidad — ¿Cuelgo la ropa hoy?

**Fecha:** 15/11/2026 · **Versión revisada:** `v0.2.0` (`4099e4e`) más los cambios del cierre (rama `cierre/2026-11-15`) · **Alcance:** código de `src/`, `next.config.ts`, CI y Dependabot, configuración del repo en GitHub, headers de producción, dependencias e historial de git.

**Qué es y qué no es.** Es una autoevaluación técnica: una revisión independiente del código
(hecha por agentes que no escribieron el código: una auditora con el checklist OWASP y una
rompedora con entradas de peor caso), chequeos automáticos y pruebas manuales.
**No** es una certificación ni una auditoría de un tercero acreditado. No aplica el OWASP LLM Top 10:
el sitio no usa modelos.

## Resumen

| Severidad | Encontrados | Corregidos | Aceptados o pendientes (con justificación) |
|---|---|---|---|
| Crítica | 0 | — | — |
| Alta | 0 | — | — |
| Media | 4 | 2 (R1, R4) + M2 en parte | M1 pendiente; M2: falta prender las alertas |
| Baja | 13 (R2, R3, L1–L6, B-1–B-5) | 4 (R2, R3, L3, L4) + L5 en parte | 8 (L1, L2, L6, B-1–B-5); L5: falta el reporte privado |
| Info | 4 | — | 4 |

Chequeos automáticos:

```
$ npm audit --package-lock-only --omit=dev
found 0 vulnerabilities
$ npm audit --package-lock-only
9 moderate severity vulnerabilities   (minimatch vía eslint 10.14.0 y typescript-eslint ≤ 8.72.2; solo desarrollo)
$ gitleaks git --redact -v .
INF 55 commits scanned.
INF no leaks found
```

Historial de git: sin secretos; `README.privado.md` nunca se commiteó; los autores usan direcciones
`noreply` de GitHub. `docs/interno/` queda en `.gitignore` desde este cierre.

## Hallazgos

### [R1] Media · Una respuesta 200 de Open-Meteo con otra forma tira un 500 sin JSON
**Dónde:** `src/app/api/weather/route.ts` (`GET`) · **Estado:** corregido en el cierre
**Evidencia:** con `null`, `{}`, `{error: true, reason}` o sin `current`/`hourly`/`daily`, la ruta tiraba
`TypeError` (`Cannot read properties of undefined (reading 'time')`) y Next respondía 500 sin `errorKey`.
**Riesgo:** la página no puede traducir el error. Open-Meteo responde así ante parámetros inválidos, y un proxy puede mandar cualquier cosa.
**Corrección:** `hasForecastShape()` valida la estructura mínima y responde 502 `weatherServiceError`. · **Test:** `src/app/api/weather/route.peor-caso.test.ts` (CA-23).

### [R4] Media · Con humedad o viento en `null`, el sitio decía SÍ verde
**Dónde:** `src/app/api/weather/route.ts`, `src/lib/decision.ts:decide()` · **Estado:** corregido en el cierre
**Evidencia:** `null >= 90` es `false`, así que `decide()` con datos faltantes (o `NaN`) cae en "SÍ, cielo despejado".
**Riesgo:** afirmar con confianza algo que no se sabe. Es el error más caro para quien usa el sitio.
**Corrección:** la ruta responde 502 `insufficientData` si falta humedad, viento o código de ahora (la clave ya existía y no se usaba). `decide()` sigue asumiendo números válidos. · **Test:** `src/app/api/weather/route.peor-caso.test.ts` (CA-24); `src/lib/decision.peor-caso.test.ts` documenta el contrato.

### [M1] Media · Se puede agotar la cuota de Open-Meteo esquivando la caché
**Dónde:** `src/app/api/weather/route.ts` (`cache: "no-store"`, sin redondeo del lado del server); `src/app/api/geocode/route.ts` (hasta 5 llamadas, 404 sin caché) · **Estado:** pendiente, #19
**Evidencia (producción):** `/api/weather?lat=-34.6&lon=-58.38&z=504418791` → `x-vercel-cache: MISS`; `lat=-34.6003239` → `MISS`; un 404 de geocode no se cachea.
**Riesgo:** con unos 120 pedidos por minuto se acaba la cuota de 600/min para todas las visitas (todo sale de las IP de Vercel). Además, cada pedido a geocode puede ocupar la función hasta 5 × 8 s.
**Corrección propuesta:** una regla de rate limit en el Firewall de Vercel sobre `/api/*`; redondear del lado del server y usar la caché de datos de `fetch` (`next: { revalidate }`) para que la clave sea la URL de Open-Meteo normalizada; cachear el 404 unos minutos. No se hizo en el cierre porque cambia la estrategia de caché del ADR-0005 y la regla del Firewall es configuración de Vercel.

### [M2] Media · Alertas de Dependabot apagadas y `npm audit` solo en PRs
**Dónde:** configuración del repo; `.github/workflows/ci.yml` · **Estado:** corregido en parte
**Evidencia:** `automated-security-fixes` → `{"enabled":false}`; `vulnerability-alerts` → 404.
**Riesgo:** un CVE de `next` o `react` podía quedar en producción hasta dos semanas (cooldown de 7 días más la corrida semanal) sin aviso.
**Corrección:** `.github/workflows/audit.yml` corre `npm audit --package-lock-only --omit=dev --audit-level=high` todos los días y en cada push a `main`. **Falta** prender Dependabot alerts y security updates en Settings → Code security (manual, #20).

### [R2] Baja · "constructor" o "__proto__" se tomaban como easter egg
**Dónde:** `src/lib/easterEggs.ts:findEasterEgg()` · **Estado:** corregido en el cierre
**Evidencia:** `findEasterEgg("constructor")` devolvía `Object`; la página habría leído `labels` de una función.
**Corrección:** `Object.hasOwn`. · **Test:** `src/lib/easterEggs.peor-caso.test.ts` (CA-25).

### [R3] Baja · Resultados de geocoding sin coordenadas
**Dónde:** `src/app/api/geocode/route.ts:searchOpenMeteo()` · **Estado:** corregido en el cierre
**Evidencia:** `{results: [{name: "Palermo"}]}` respondía 200 sin `latitude`; `[null, …]` daba 502.
**Corrección:** se filtran los resultados sin coordenadas numéricas. · **Test:** `src/app/api/geocode/route.peor-caso.test.ts` (CA-26).

### [L1] Baja · `main` sin protección y el pineo por SHA no se exige
**Dónde:** configuración del repo · **Estado:** para decidir, #21
**Evidencia:** `branches/main/protection` → "Branch not protected"; `rulesets` → `[]`; `sha_pinning_required: false`.
**Riesgo:** se puede mergear con la CI en rojo o pushear directo a `main`, que deploya a producción.
**Corrección propuesta:** ruleset en `main` (PR obligatorio, check `check` en verde, sin force-push) y `sha_pinning_required`.

### [L2] Baja · BigDataCloud recibe las coordenadas con precisión de GPS
**Dónde:** `src/app/page.tsx:fetchLocationLabels()` · **Estado:** para decidir, #22
**Riesgo:** un tercero recibe la ubicación exacta junto con la IP; para el nombre del barrio alcanza menos.
**Corrección propuesta:** redondear a 3 decimales (~100 m). Cambia lo que ve la persona si el barrio cambia, por eso queda para la usuaria.

### [L3] Baja · El README prometía "no se guarda"
**Dónde:** `README.md` · **Estado:** corregido en el cierre
**Evidencia:** las coordenadas redondeadas y la ciudad viajan en la URL, y quedan en los logs de Vercel y en la caché de la CDN.
**Corrección:** el README y la spec dicen que los registros de acceso de Vercel pueden tenerlas un tiempo.

### [L4] Baja · El ADR-0003 sobreestimaba lo que frena `connect-src`
**Dónde:** `docs/adr/0003-csp-sin-nonce.md` · **Estado:** corregido en el cierre
**Evidencia:** un XSS puede sacar datos navegando la página (`location = …`), que `connect-src` no cubre.
**Corrección:** el ADR lo dice. No hay dónde inyectar HTML hoy.

### [L5] Baja · Sin canal privado de reporte y `SECURITY.md` inexistente
**Estado:** `SECURITY.md` creado en el cierre; **falta** prender Private vulnerability reporting (manual, #20).

### [L6] Baja · 9 vulnerabilidades moderadas en dependencias de desarrollo
**Estado:** aceptado. Solo afectan al lint; `--omit=dev` da 0. Las sube Dependabot.

## Aceptados con justificación

Casos de la rompedora que quedaron como tests que documentan el comportamiento actual:

| # | Qué | Por qué se acepta | Cuándo se revisa |
|---|---|---|---|
| B-1 | `/api/weather` acepta `lat=%20` (0), `0x10` (16) y `1e1` (10) | La página siempre manda decimales; dan coordenadas válidas | Si el API se abre a terceros |
| B-2 | Con datos incoherentes de Open-Meteo (`current.time` fuera de la ventana, `daily.weather_code` más corto) la vista previa muestra horas pasadas o 🌡️ | Solo con datos rotos de Open-Meteo; la decisión no cambia | Si aparece en producción |
| B-3 | El límite de 200 cuenta unidades UTF-16 (100 emojis), `lang=EN` cuenta como español, el espacio de ancho cero se busca y da 404 | La página manda `es`/`en` en minúscula; el límite es de tamaño | — |
| B-4 | Easter eggs con espacios internos dobles o nbsp no matchean; `toBinary` con caracteres fuera de ASCII da grupos de más de 8 bits | Los easter eggs binarios de hoy son ASCII | Si se suma uno con emoji |
| B-5 | Humedad fraccionaria (89,6 %) da SÍ con el texto "90 %" | Open-Meteo manda enteros | Si se cambia de fuente |
| L6 | Moderadas de desarrollo | No llegan a producción | PR semanal de Dependabot |
| I1 | JSON-LD estático de `layout.tsx` sin escapar `<` | Son constantes | Si entra algo dinámico |
| I2 | gitleaks marca claves de preview en `.next/` | Se generan en cada build local y `.next/` está ignorado | — |
| I3 | El redirect de `.vercel.app` no corre para quien no tiene sesión | La protección de deployments de Vercel intercepta antes; no hay redirect abierto | — |
| I4 | `public/googleefef8692d04eb973.html` | Verificación de Search Console, pública por diseño | — |

## Qué no se revisó

- El panel de Vercel: variables de entorno, retención de logs, log drains, analítica, comando de instalación.
- Refs de GitHub que no están bajadas (`refs/pull/*`, ramas borradas en el remoto).
- Los límites reales de Open-Meteo para las IP de Vercel.
- `src/app/page.tsx` con tests: no hay entorno de DOM en vitest; se probó a mano en el navegador (#23).
- HSTS preload y subdominios afectados por `includeSubDomains`.
