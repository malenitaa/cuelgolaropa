import { NextRequest, NextResponse } from "next/server";
import { decide, type HourlyPoint } from "@/lib/decision";

interface OpenMeteoForecastResponse {
  current_weather: {
    time: string;
    temperature: number;
    weathercode: number;
    is_day: 0 | 1;
  };
  hourly: {
    time: string[];
    precipitation_probability: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    weather_code: number[];
    temperature_2m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
  };
}

const WINDOW_SIZE = 8;
const FETCH_TIMEOUT_MS = 8_000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ errorKey: "missingCoords" }, { status: 400 });
  }

  const latitude = Number(lat);
  const longitude = Number(lon);
  if (
    Number.isNaN(latitude) || Number.isNaN(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return NextResponse.json({ errorKey: "invalidCoords" }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "hourly",
    "precipitation_probability,relative_humidity_2m,wind_speed_10m,weather_code,temperature_2m"
  );
  url.searchParams.set("daily", "weather_code");
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "4");

  let data: OpenMeteoForecastResponse;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      return NextResponse.json(
        { errorKey: "weatherServiceError" },
        { status: 502 }
      );
    }
    data = await res.json();
  } catch {
    return NextResponse.json(
      { errorKey: "weatherServiceUnreachable" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }

  const { current_weather, hourly, daily } = data;

  let startIndex = hourly.time.findIndex((t) => t >= current_weather.time);
  if (startIndex === -1) startIndex = 0;

  const candidate: HourlyPoint[] = hourly.time
    .slice(startIndex, startIndex + WINDOW_SIZE)
    .map((time, i) => ({
      time,
      precipitationProbability:
        hourly.precipitation_probability[startIndex + i] ?? 0,
      humidity: hourly.relative_humidity_2m[startIndex + i] ?? 0,
      windSpeed: hourly.wind_speed_10m[startIndex + i] ?? 0,
      weatherCode: hourly.weather_code[startIndex + i] ?? 0,
    }));

  if (candidate.length === 0) {
    return NextResponse.json(
      { errorKey: "insufficientData" },
      { status: 502 }
    );
  }

  const result = decide(candidate, current_weather.weathercode);

  return NextResponse.json({
    ...result,
    current: {
      time: current_weather.time,
      temperature: current_weather.temperature,
      weatherCode: current_weather.weathercode,
      isDay: current_weather.is_day === 1,
    },
    hourlyPreview: candidate.slice(0, 6).map((h, i) => ({
      time: h.time,
      precipitationProbability: h.precipitationProbability,
      weatherCode: h.weatherCode,
      temperature: hourly.temperature_2m[startIndex + i] ?? null,
    })),
    dailyPreview: daily.time.slice(1, 4).map((date, i) => ({
      day: Number(date.slice(8, 10)),
      weekdayIndex: new Date(`${date}T00:00:00`).getDay(),
      weatherCode: daily.weather_code[i + 1],
    })),
  });
}
