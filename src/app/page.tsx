"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { weatherCodeToEmoji } from "@/lib/weatherCodes";
import type { ReasonKey } from "@/lib/decision";
import {
  UI,
  REASONS,
  ERRORS,
  WEEKDAY_LETTERS,
  detectLang,
  type Lang,
  type ErrorKey,
} from "@/lib/i18n";

type Phase = "locating" | "need-city" | "loading" | "result" | "error";
type DecisionColor = "green" | "yellow" | "red";

const LANG_STORAGE_KEY = "cuelgolaropa-lang";

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
  current: { isDay: boolean };
  hourlyPreview: HourlyPreviewItem[];
  dailyPreview: DailyPreviewItem[];
}

interface ApiError {
  errorKey: ErrorKey;
  detail?: string;
}

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

function formatHour(iso: string) {
  return iso.slice(11, 16);
}

function setFavicon(emoji: string) {
  if (typeof document === "undefined") return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = href;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-10 dark:bg-black">
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
      className={`fixed top-3 right-3 z-10 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
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
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [showDaily, setShowDaily] = useState(false);

  const t = UI[lang];

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    const initial: Lang = stored === "es" || stored === "en" ? stored : detectLang();
    const id = setTimeout(() => setLang(initial), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function toggleLang() {
    const next: Lang = lang === "es" ? "en" : "es";
    setLang(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  }

  useEffect(() => {
    if (phase === "result" && result) {
      setFavicon(result.current.isDay ? "☀️" : "🌙");
    } else {
      setFavicon("☁️");
    }
  }, [phase, result]);

  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setPhase("loading");
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
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

  useEffect(() => {
    if (!hasGeolocation()) {
      const id = setTimeout(() => setPhase("need-city"), 0);
      return () => clearTimeout(id);
    }
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        setPhase("need-city");
      }
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        setPhase("need-city");
      },
      { timeout: 9000, maximumAge: 5 * 60 * 1000 }
    );

    return () => clearTimeout(timeoutId);
  }, [fetchWeather]);

  async function handleCitySubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) return;
    setPhase("loading");
    try {
      const res = await fetch(
        `/api/geocode?city=${encodeURIComponent(trimmed)}&lang=${lang}`
      );
      const data = await res.json();
      if (!res.ok) {
        const err = data as ApiError;
        setErrorMessage(ERRORS[lang][err.errorKey](err.detail));
        setPhase("error");
        return;
      }
      setLocationLabel(
        [data.name, data.admin1, data.country].filter(Boolean).join(", ")
      );
      await fetchWeather(data.latitude, data.longitude);
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
    return (
      <>
        <LangToggle
          lang={lang}
          onToggle={toggleLang}
          className={`${styles.chipBg} ${styles.text}`}
        />
        <div
          className={`flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center ${styles.bg}`}
        >
          {locationLabel && (
            <p
              className={`text-sm font-medium uppercase tracking-wide ${styles.subtext}`}
            >
              {locationLabel}
            </p>
          )}
          <h1
            className={`text-[28vw] font-black leading-none drop-shadow-sm sm:text-[18vw] ${styles.text}`}
          >
            {isSi ? "SÍ" : "NO"}
          </h1>
          <p className={`max-w-md text-xl font-medium sm:text-2xl ${styles.text}`}>
            {isSi ? t.canHang : t.cannotHang} —{" "}
            {REASONS[lang][result.reasonKey](result.reasonValue)}
          </p>
          <div
            className={`mt-2 flex gap-3 rounded-2xl px-4 py-3 backdrop-blur-sm ${styles.chipBg}`}
          >
            {result.hourlyPreview.map((h) => (
              <div
                key={h.time}
                className={`flex flex-col items-center gap-1 ${styles.text}`}
              >
                <span className="text-xs font-medium opacity-80">
                  {formatHour(h.time)}
                </span>
                <span className="text-2xl">
                  {weatherCodeToEmoji(h.weatherCode)}
                </span>
                <span className="text-xs opacity-80">
                  💧{Math.round(h.precipitationProbability)}%
                </span>
              </div>
            ))}
          </div>
          {showDaily ? (
            <div
              className={`flex gap-4 rounded-2xl px-4 py-3 backdrop-blur-sm ${styles.chipBg}`}
            >
              {result.dailyPreview.map((d) => (
                <div
                  key={d.day}
                  className={`flex flex-col items-center gap-1 ${styles.text}`}
                >
                  <span className="text-xs font-semibold opacity-80">
                    {WEEKDAY_LETTERS[lang][d.weekdayIndex]}
                  </span>
                  <span className="text-2xl">
                    {weatherCodeToEmoji(d.weatherCode)}
                  </span>
                  <span className="text-xs opacity-80">{d.day}</span>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setShowDaily(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${styles.chipBg} ${styles.text}`}
            >
              {t.viewNextDays}
            </button>
          )}
          <button
            onClick={() => {
              setResult(null);
              setLocationLabel(null);
              setShowDaily(false);
              setPhase("need-city");
            }}
            className={`mt-4 text-sm font-medium underline underline-offset-4 ${styles.linkText}`}
          >
            {t.tryAnotherCity}
          </button>
        </div>
      </>
    );
  }

  return null;
}
