"use client";

import { useEffect, useState } from "react";
import { weatherCodeToEmoji } from "@/lib/weatherCodes";

type Phase = "locating" | "need-city" | "loading" | "result" | "error";
type DecisionColor = "green" | "yellow" | "red";

interface HourlyPreviewItem {
  time: string;
  precipitationProbability: number;
  weatherCode: number;
  temperature: number | null;
}

interface DailyPreviewItem {
  day: number;
  weatherCode: number;
}

interface WeatherResult {
  decision: "SI" | "NO";
  color: DecisionColor;
  reason: string;
  current: { isDay: boolean };
  hourlyPreview: HourlyPreviewItem[];
  dailyPreview: DailyPreviewItem[];
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

function hasGeolocation() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("locating");
  const [errorMessage, setErrorMessage] = useState("");
  const [city, setCity] = useState("");
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [showDaily, setShowDaily] = useState(false);

  useEffect(() => {
    if (phase === "result" && result) {
      setFavicon(result.current.isDay ? "☀️" : "🌙");
    } else {
      setFavicon("☁️");
    }
  }, [phase, result]);

  async function fetchWeather(lat: number, lon: number) {
    setPhase("loading");
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "No se pudo obtener el clima.");
        setPhase("error");
        return;
      }
      setResult(data);
      setPhase("result");
    } catch {
      setErrorMessage("No se pudo obtener el clima. Revisá tu conexión.");
      setPhase("error");
    }
  }

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
  }, []);

  async function handleCitySubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) return;
    setPhase("loading");
    try {
      const res = await fetch(`/api/geocode?city=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "No se encontró la ciudad.");
        setPhase("error");
        return;
      }
      setLocationLabel(
        [data.name, data.admin1, data.country].filter(Boolean).join(", ")
      );
      await fetchWeather(data.latitude, data.longitude);
    } catch {
      setErrorMessage("No se pudo buscar la ciudad. Revisá tu conexión.");
      setPhase("error");
    }
  }

  if (phase === "locating" || phase === "loading") {
    return (
      <Screen>
        <p className="animate-pulse text-2xl text-zinc-500 dark:text-zinc-400">
          {phase === "locating"
            ? "Buscando tu ubicación…"
            : "Consultando el clima…"}
        </p>
      </Screen>
    );
  }

  if (phase === "need-city") {
    return (
      <Screen>
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-xl text-zinc-600 dark:text-zinc-300">
            No pudimos usar tu ubicación. ¿En qué ciudad estás?
          </p>
          <form onSubmit={handleCitySubmit} className="flex w-full gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej: Rosario"
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-400"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-5 py-3 text-lg font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Ir
            </button>
          </form>
        </div>
      </Screen>
    );
  }

  if (phase === "error") {
    return (
      <Screen>
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-xl text-zinc-600 dark:text-zinc-300">
            {errorMessage}
          </p>
          <button
            onClick={() => setPhase("need-city")}
            className="rounded-lg bg-zinc-900 px-5 py-3 text-lg font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Probar con otra ciudad
          </button>
        </div>
      </Screen>
    );
  }

  if (result) {
    const isSi = result.decision === "SI";
    const styles = COLOR_STYLES[result.color];
    return (
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
          {isSi ? "Podés colgar la ropa" : "Mejor no cuelgues la ropa"} —{" "}
          {result.reason}
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
              <span className="text-2xl">{weatherCodeToEmoji(h.weatherCode)}</span>
              <span className="text-xs opacity-80">
                {Math.round(h.precipitationProbability)}%
              </span>
            </div>
          ))}
        </div>
        {showDaily ? (
          <div
            className={`flex items-center gap-3 text-sm font-medium ${styles.text}`}
          >
            {result.dailyPreview.map((d) => (
              <span key={d.day} className="flex items-center gap-1">
                {d.day} {weatherCodeToEmoji(d.weatherCode)}
              </span>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setShowDaily(true)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${styles.chipBg} ${styles.text}`}
          >
            Ver próximos 3 días
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
          Probar otra ciudad
        </button>
      </div>
    );
  }

  return null;
}
