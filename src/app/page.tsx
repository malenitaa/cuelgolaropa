"use client";

import { useEffect, useState } from "react";
import { weatherCodeToEmoji } from "@/lib/weatherCodes";

type Phase = "locating" | "need-city" | "loading" | "result" | "error";

interface HourlyPreviewItem {
  time: string;
  precipitationProbability: number;
  weatherCode: number;
  temperature: number | null;
}

interface WeatherResult {
  decision: "SI" | "NO";
  reason: string;
  hourlyPreview: HourlyPreviewItem[];
}

function formatHour(iso: string) {
  return iso.slice(11, 16);
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-10">
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
        <p className="animate-pulse text-xl text-zinc-500">
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
          <p className="text-lg text-zinc-600">
            No pudimos usar tu ubicación. ¿En qué ciudad estás?
          </p>
          <form onSubmit={handleCitySubmit} className="flex w-full gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej: Rosario"
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-lg outline-none focus:border-zinc-500"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-5 py-3 text-lg font-semibold text-white"
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
          <p className="text-lg text-zinc-600">{errorMessage}</p>
          <button
            onClick={() => setPhase("need-city")}
            className="rounded-lg bg-zinc-900 px-5 py-3 text-lg font-semibold text-white"
          >
            Probar con otra ciudad
          </button>
        </div>
      </Screen>
    );
  }

  if (result) {
    const isSi = result.decision === "SI";
    return (
      <div
        className={`flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center ${
          isSi ? "bg-emerald-500" : "bg-rose-600"
        }`}
      >
        {locationLabel && (
          <p className="text-sm font-medium uppercase tracking-wide text-white/80">
            {locationLabel}
          </p>
        )}
        <h1 className="text-[28vw] font-black leading-none text-white drop-shadow-sm sm:text-[18vw]">
          {isSi ? "SÍ" : "NO"}
        </h1>
        <p className="max-w-md text-xl font-medium text-white sm:text-2xl">
          {isSi ? "Podés colgar la ropa" : "Mejor no cuelgues la ropa"} —{" "}
          {result.reason}
        </p>
        <div className="mt-2 flex gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
          {result.hourlyPreview.map((h) => (
            <div
              key={h.time}
              className="flex flex-col items-center gap-1 text-white"
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
        <button
          onClick={() => {
            setResult(null);
            setLocationLabel(null);
            setPhase("need-city");
          }}
          className="mt-4 text-sm font-medium text-white/70 underline underline-offset-4"
        >
          Probar otra ciudad
        </button>
      </div>
    );
  }

  return null;
}
