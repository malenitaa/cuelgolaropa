"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { weatherCodeToEmoji } from "@/lib/weatherCodes";
import type { ReasonKey } from "@/lib/decision";
import { findEasterEgg, toBinary } from "@/lib/easterEggs";
import {
  UI,
  REASONS,
  ERRORS,
  WEEKDAY_LETTERS,
  LATER_WARNING,
  detectLang,
  type Lang,
  type ErrorKey,
} from "@/lib/i18n";

type Phase = "locating" | "need-city" | "loading" | "result" | "error";
type DecisionColor = "green" | "yellow" | "red";

const LANG_STORAGE_KEY = "cuelgolaropa-lang";
// Nombre fijo: los términos de BigDataCloud no permiten geocodificar
// coordenadas guardadas, solo la ubicación actual del dispositivo.
const DEFAULT_CITY = {
  lat: -34.6037,
  lon: -58.3816,
  labels: { es: "Buenos Aires, Argentina", en: "Buenos Aires, Argentina" },
};

interface HourlyPreviewItem {
  time: string;
  precipitationProbability: number;
  weatherCode: number;
  temperature: number | null;
}

interface DailyPreviewItem {
  day: number;
  weekdayIndex: number;
  weatherCode: number;
}

interface WeatherResult {
  decision: "SI" | "NO";
  color: DecisionColor;
  reasonKey: ReasonKey;
  reasonValue: number | null;
  worsensAt?: string | null;
  customReason?: { es: string; en: string };
  binaryMode?: boolean;
  current: { isDay: boolean; weatherCode: number };
  hourlyPreview: HourlyPreviewItem[];
  dailyPreview: DailyPreviewItem[];
}

interface ApiError {
  errorKey: ErrorKey;
  detail?: string;
}

interface LocationLabels {
  es: string;
  en: string;
}

interface RawLocation {
  name: string | null;
  admin1: string | null;
  country: string | null;
}

function buildLocationLabel(data: RawLocation) {
  return [data.name, data.admin1, data.country].filter(Boolean).join(", ");
}

interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

// El endpoint gratis de BigDataCloud solo se puede llamar desde el navegador
// (su fair use policy banea la IP si se llama desde un server).
async function reverseGeocode(lat: number, lon: number, lang: Lang) {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("localityLanguage", lang);
  const res = await fetch(url);
  if (!res.ok) throw new Error("reverseGeocodeFailed");
  const data = (await res.json()) as BigDataCloudResponse;
  return buildLocationLabel({
    name: data.city || data.locality || null,
    admin1: data.principalSubdivision || null,
    country: data.countryName || null,
  });
}

// ~1 km: alcanza para el pronóstico y hace que visitas cercanas pidan la
// misma URL, que la CDN tiene cacheada (ver /api/weather).
const roundCoord = (n: number) => Math.round(n * 100) / 100;

const COLOR_STYLES: Record<
  DecisionColor,
  { bg: string; text: string; subtext: string; chipBg: string; linkText: string }
> = {
  green: {
    bg: "bg-emerald-500",
    text: "text-white",
    subtext: "text-white/80",
    chipBg: "bg-white/15",
    linkText: "text-white/70",
  },
  yellow: {
    bg: "bg-amber-400",
    text: "text-zinc-900",
    subtext: "text-zinc-900/70",
    chipBg: "bg-black/10",
    linkText: "text-zinc-900/60",
  },
  red: {
    bg: "bg-rose-600",
    text: "text-white",
    subtext: "text-white/80",
    chipBg: "bg-white/15",
    linkText: "text-white/70",
  },
};

const COLOR_HEX: Record<DecisionColor, string> = {
  green: "#10b981",
  yellow: "#fbbf24",
  red: "#e11d48",
};

function formatHour(iso: string) {
  return iso.slice(11, 16);
}

function setThemeColor(color: string) {
  if (typeof document === "undefined") return;
  // Next.js renders separate light/dark theme-color metas; collapse them
  // into a single tag we fully control so there's no ambiguity about
  // which one the browser picks.
  const metas = document.querySelectorAll<HTMLMetaElement>(
    "meta[name='theme-color']"
  );
  metas.forEach((m, i) => {
    if (i > 0) m.remove();
  });
  let meta = metas[0];
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  } else {
    meta.removeAttribute("media");
  }
  meta.content = color;
}

function faviconEmojiFor(weatherCode: number, isDay: boolean) {
  // Cielo despejado es el único caso donde importa si es de día o de noche;
  // el resto de los íconos de clima (nube, lluvia, nieve) sirven para ambos.
  if (weatherCode === 0) return isDay ? "☀️" : "🌙";
  return weatherCodeToEmoji(weatherCode);
}

function isDaytimeNow() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 20;
}

function isDaytimeAtLongitude(lon: number) {
  // Sin timezone real todavía (estamos esperando la respuesta del clima),
  // aproximamos la hora local de la ciudad buscada por su longitud
  // (~15° por huso horario) en vez de usar la hora del navegador.
  const utcHour = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  const localHour = (utcHour + lon / 15 + 24) % 24;
  return localHour >= 6 && localHour < 20;
}

function setFavicon(emoji: string) {
  if (typeof document === "undefined") return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  // Safari no repinta el ícono de la pestaña si solo se muta el href de un
  // <link> existente; hay que reemplazar el elemento para que lo note.
  document
    .querySelectorAll<HTMLLinkElement>("link[rel='icon']")
    .forEach((el) => el.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = href;
  document.head.appendChild(link);
}

function setJsonLd(data: object | null) {
  if (typeof document === "undefined") return;
  const existing = document.querySelector<HTMLScriptElement>(
    "script[data-dynamic-jsonld]"
  );
  if (!data) {
    existing?.remove();
    return;
  }
  const script = existing ?? document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-dynamic-jsonld", "true");
  script.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(script);
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[var(--app-height)] flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-10 dark:bg-black">
      {children}
    </div>
  );
}

function LangToggle({
  lang,
  onToggle,
  className,
}: {
  lang: Lang;
  onToggle: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`fixed top-3 right-3 z-10 flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {lang === "es" ? "EN" : "ES"}
    </button>
  );
}

function hasGeolocation() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("locating");
  const [lang, setLang] = useState<Lang>("es");
  const [errorMessage, setErrorMessage] = useState("");
  const [city, setCity] = useState("");
  const [locationLabels, setLocationLabels] = useState<LocationLabels | null>(
    null
  );
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [pendingLon, setPendingLon] = useState<number | null>(null);
  const [showDaily, setShowDaily] = useState(false);
  const [binaryToggled, setBinaryToggled] = useState(false);
  const [binaryHovered, setBinaryHovered] = useState(false);

  const t = UI[lang];
  const locationLabel = locationLabels ? locationLabels[lang] : null;

  useEffect(() => {
    // iOS Safari's dvh unit can get stuck at the wrong value on pages that
    // never scroll (nothing triggers it to reconcile with the toolbar's
    // current state), leaving a blank gap below the content. Track the
    // real visible height ourselves via visualViewport/innerHeight instead.
    //
    // visualViewport.height also shrinks when the user pinch-zooms on
    // desktop Chrome/Safari (it reports the smaller visible slice of the
    // page, with .scale > 1), even though the page's own layout viewport
    // (innerHeight) hasn't changed. Following it in that case would shrink
    // the color block to less than the full window, leaving the default
    // background exposed around it — so only trust it while scale is ~1.
    function setAppHeight() {
      const vv = window.visualViewport;
      const height = vv && vv.scale <= 1 ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    }
    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener("resize", setAppHeight);
    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener("resize", setAppHeight);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    const initial: Lang = stored === "es" || stored === "en" ? stored : detectLang();
    const id = setTimeout(() => setLang(initial), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.pageTitle;
  }, [lang, t.pageTitle]);

  function toggleLang() {
    const next: Lang = lang === "es" ? "en" : "es";
    setLang(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  }

  useEffect(() => {
    if (phase === "result" && result) {
      setFavicon(faviconEmojiFor(result.current.weatherCode, result.current.isDay));
    } else if (pendingLon !== null) {
      setFavicon(isDaytimeAtLongitude(pendingLon) ? "☀️" : "🌙");
    } else {
      setFavicon(isDaytimeNow() ? "☀️" : "🌙");
    }
  }, [phase, result, pendingLon]);

  useEffect(() => {
    if (phase === "result" && result) {
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: t.pageTitle,
        dateModified: new Date().toISOString(),
        about: {
          "@type": "Answer",
          text: `${result.decision === "SI" ? t.canHang : t.cannotHang}${
            locationLabel ? ` — ${locationLabel}` : ""
          }`,
        },
      });
    } else {
      setJsonLd(null);
    }
  }, [phase, result, t, locationLabel]);

  useEffect(() => {
    // Safari tints the area around its floating bottom bar using
    // theme-color; without this it stays white/grey even when the result
    // screen is green/amber/red, showing up as a mismatched blank strip.
    //
    // body's own background stays white/black (see globals.css) since it's
    // static CSS with no idea which color screen is showing. Whenever the
    // screen doesn't exactly cover the visual viewport — under Safari's
    // status bar/safe area, or for a frame during toolbar animations — the
    // browser paints that gap with body's background, so we keep it in
    // sync here too instead of leaving it white/black.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function update() {
      const color =
        phase === "result" && result
          ? COLOR_HEX[result.color]
          : media.matches
            ? "#000000"
            : "#fafafa";
      setThemeColor(color);
      document.body.style.backgroundColor = color;
    }
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [phase, result]);

  useEffect(() => {
    if (phase !== "result" || !result) return;
    function handleKeydown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "BUTTON" || tag === "A") return;
      e.preventDefault();
      if (result?.binaryMode) {
        setBinaryToggled((prev) => !prev);
      } else {
        setShowDaily((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [phase, result]);

  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setPendingLon(lon);
    setPhase("loading");
    try {
      const res = await fetch(
        `/api/weather?lat=${roundCoord(lat)}&lon=${roundCoord(lon)}`
      );
      const data = await res.json();
      if (!res.ok) {
        const err = data as ApiError;
        setErrorMessage(ERRORS[langRef.current][err.errorKey](err.detail));
        setPhase("error");
        return;
      }
      setResult(data);
      setPhase("result");
    } catch {
      setErrorMessage(ERRORS[langRef.current].networkError());
      setPhase("error");
    }
  }, []);

  const fetchLocationLabels = useCallback((lat: number, lon: number) => {
    Promise.all([
      reverseGeocode(lat, lon, "es"),
      reverseGeocode(lat, lon, "en"),
    ])
      .then(([es, en]) => setLocationLabels({ es, en }))
      .catch(() => {
        // Best-effort: no location label if reverse geocoding fails.
      });
  }, []);

  const fetchDefaultCity = useCallback(() => {
    fetchWeather(DEFAULT_CITY.lat, DEFAULT_CITY.lon);
    setLocationLabels(DEFAULT_CITY.labels);
  }, [fetchWeather]);

  useEffect(() => {
    if (!hasGeolocation()) {
      const id = setTimeout(() => fetchDefaultCity(), 0);
      return () => clearTimeout(id);
    }
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        fetchDefaultCity();
      }
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        const { latitude, longitude } = pos.coords;
        fetchWeather(latitude, longitude);
        fetchLocationLabels(latitude, longitude);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        fetchDefaultCity();
      },
      { timeout: 9000, maximumAge: 5 * 60 * 1000 }
    );

    return () => clearTimeout(timeoutId);
  }, [fetchWeather, fetchLocationLabels, fetchDefaultCity]);

  async function handleCitySubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) return;

    const easterEgg = findEasterEgg(trimmed);
    if (easterEgg) {
      setLocationLabels(easterEgg.labels);
      setResult({
        decision: easterEgg.decision,
        color: easterEgg.color,
        reasonKey: "clear",
        reasonValue: null,
        customReason: easterEgg.reason,
        binaryMode: easterEgg.binaryMode,
        current: { isDay: true, weatherCode: 0 },
        hourlyPreview: [],
        dailyPreview: [],
      });
      setPhase("result");
      return;
    }

    setPhase("loading");
    try {
      const [esRes, enRes] = await Promise.all([
        fetch(`/api/geocode?city=${encodeURIComponent(trimmed)}&lang=es`),
        fetch(`/api/geocode?city=${encodeURIComponent(trimmed)}&lang=en`),
      ]);
      const esData = await esRes.json();
      const enData = await enRes.json();
      if (!esRes.ok || !enRes.ok) {
        const err = (esRes.ok ? enData : esData) as ApiError;
        setErrorMessage(ERRORS[lang][err.errorKey](err.detail));
        setPhase("error");
        return;
      }
      setLocationLabels({
        es: buildLocationLabel(esData),
        en: buildLocationLabel(enData),
      });
      await fetchWeather(esData.latitude, esData.longitude);
    } catch {
      setErrorMessage(ERRORS[lang].networkError());
      setPhase("error");
    }
  }

  if (phase === "locating" || phase === "loading") {
    return (
      <>
        <LangToggle
          lang={lang}
          onToggle={toggleLang}
          className="bg-black/10 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
        />
        <Screen>
          <p className="animate-pulse text-2xl text-zinc-500 dark:text-zinc-400">
            {phase === "locating" ? t.locating : t.loadingWeather}
          </p>
        </Screen>
      </>
    );
  }

  if (phase === "need-city") {
    return (
      <>
        <LangToggle
          lang={lang}
          onToggle={toggleLang}
          className="bg-black/10 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
        />
        <Screen>
          <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-xl text-zinc-600 dark:text-zinc-300">
              {t.needCityPrompt}
            </p>
            <form onSubmit={handleCitySubmit} className="flex w-full gap-2">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t.cityPlaceholder}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-400"
                autoFocus
              />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-5 py-3 text-lg font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {t.go}
              </button>
            </form>
          </div>
        </Screen>
      </>
    );
  }

  if (phase === "error") {
    return (
      <>
        <LangToggle
          lang={lang}
          onToggle={toggleLang}
          className="bg-black/10 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
        />
        <Screen>
          <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-xl text-zinc-600 dark:text-zinc-300">
              {errorMessage}
            </p>
            <button
              onClick={() => setPhase("need-city")}
              className="rounded-lg bg-zinc-900 px-5 py-3 text-lg font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {t.retryCity}
            </button>
          </div>
        </Screen>
      </>
    );
  }

  if (result) {
    const isSi = result.decision === "SI";
    const styles = COLOR_STYLES[result.color];
    const rawWord = isSi ? t.yes : t.no;
    const rawReasonSentence = `${isSi ? t.canHang : t.cannotHang} — ${
      result.customReason
        ? result.customReason[lang]
        : REASONS[lang][result.reasonKey](result.reasonValue)
    }${
      isSi && result.worsensAt
        ? `. ${LATER_WARNING[lang](formatHour(result.worsensAt))}`
        : ""
    }`;
    const isBinaryHidden =
      !!result.binaryMode && !binaryToggled && !binaryHovered;
    return (
      <>
        <LangToggle
          lang={lang}
          onToggle={toggleLang}
          className={`${styles.chipBg} ${styles.text}`}
        />
        <div
          className={`flex min-h-[var(--app-height)] flex-col px-6 py-10 text-center ${styles.bg}`}
        >
          <div
            className="flex flex-1 flex-col items-center justify-center gap-5"
            onMouseEnter={
              result.binaryMode ? () => setBinaryHovered(true) : undefined
            }
            onMouseLeave={
              result.binaryMode ? () => setBinaryHovered(false) : undefined
            }
          >
            {locationLabel && (
              <p
                className={`text-sm font-medium uppercase tracking-wide ${styles.subtext} ${
                  isBinaryHidden ? "font-mono" : ""
                }`}
              >
                {isBinaryHidden ? toBinary(locationLabel) : locationLabel}
              </p>
            )}
            <h1
              className={`leading-none drop-shadow-sm ${styles.text} ${
                isBinaryHidden
                  ? "font-mono text-2xl tracking-tight sm:text-4xl"
                  : "text-[24vw] font-black sm:text-[14vw]"
              }`}
            >
              {isBinaryHidden ? toBinary(rawWord) : rawWord}
            </h1>
            <p
              className={`max-w-md text-lg font-medium sm:text-xl ${styles.text} ${
                isBinaryHidden ? "font-mono text-sm sm:text-base" : ""
              }`}
            >
              {isBinaryHidden
                ? toBinary(rawReasonSentence)
                : rawReasonSentence}
            </p>
            {result.hourlyPreview.length > 0 && (
              <div
                className={`mt-1 flex gap-2 rounded-2xl px-3 py-2 backdrop-blur-sm ${styles.chipBg}`}
              >
                {result.hourlyPreview.map((h) => (
                  <div
                    key={h.time}
                    className={`flex flex-col items-center gap-0.5 ${styles.text}`}
                  >
                    <span className="text-[11px] font-medium opacity-80">
                      {formatHour(h.time)}
                    </span>
                    <span className="text-lg">
                      {weatherCodeToEmoji(h.weatherCode)}
                    </span>
                    <span className="text-[11px] opacity-80">
                      💧{Math.round(h.precipitationProbability)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-3 pb-2">
            {result.dailyPreview.length > 0 && (
              <div className="grid">
                <div
                  onClick={() => setShowDaily(false)}
                  className={`col-start-1 row-start-1 flex place-self-center gap-3 rounded-2xl px-3 py-2 backdrop-blur-sm ${styles.chipBg} ${
                    showDaily ? "cursor-pointer" : "invisible pointer-events-none"
                  }`}
                >
                  {result.dailyPreview.map((d) => (
                    <div
                      key={d.day}
                      className={`flex flex-col items-center gap-0.5 ${styles.text}`}
                    >
                      <span className="text-[11px] font-semibold opacity-80">
                        {WEEKDAY_LETTERS[lang][d.weekdayIndex]}
                      </span>
                      <span className="text-lg">
                        {weatherCodeToEmoji(d.weatherCode)}
                      </span>
                      <span className="text-[11px] opacity-80">{d.day}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowDaily(true)}
                  className={`col-start-1 row-start-1 place-self-center rounded-full px-3 py-1 text-xs font-medium ${styles.chipBg} ${styles.text} ${
                    showDaily ? "invisible pointer-events-none" : ""
                  }`}
                >
                  {t.viewNextDays}
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setResult(null);
                setLocationLabels(null);
                setShowDaily(false);
                setBinaryToggled(false);
                setBinaryHovered(false);
                setPhase("need-city");
              }}
              className={`text-sm font-medium underline underline-offset-4 ${styles.linkText}`}
            >
              {t.tryAnotherCity}
            </button>
            <p className={`text-[10px] ${styles.linkText}`}>
              {t.dataBy}{" "}
              <a href="https://open-meteo.com/" className="underline">
                Open-Meteo.com
              </a>{" "}
              ·{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                className="underline"
              >
                CC BY 4.0
              </a>
            </p>
          </div>
        </div>
      </>
    );
  }

  return null;
}
