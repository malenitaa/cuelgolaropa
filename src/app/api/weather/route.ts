import { NextRequest, NextResponse } from "next/server";
import { decide, type HourlyPoint } from "@/lib/decision";

interface OpenMeteoForecastResponse {
  current_weather: {
    time: string;
    temperature: number;
    weathercode: number;
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
    sunrise: string[];
    sunset: string[];
  };
}

const WINDOW_SIZE = 8;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Faltan los parámetros lat y lon." },
      { status: 400 }
    );
  }

  const latitude = Number(lat);
  const longitude = Number(lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json(
      { error: "lat y lon deben ser números válidos." },
      { status: 400 }
    );
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "hourly",
    "precipitation_probability,relative_humidity_2m,wind_speed_10m,weather_code,temperature_2m"
  );
  url.searchParams.set("daily", "sunrise,sunset");
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  let data: OpenMeteoForecastResponse;
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "El servicio de clima no respondió correctamente." },
        { status: 502 }
      );
    }
    data = await res.json();
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar al servicio de clima." },
      { status: 502 }
    );
  }

  const { current_weather, hourly, daily } = data;
  const sunrise = daily.sunrise[0];
  const sunset = daily.sunset[0];

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

  const currentResponse = {
    current: {
      time: current_weather.time,
      temperature: current_weather.temperature,
      weatherCode: current_weather.weathercode,
    },
    hourlyPreview: candidate.slice(0, 6).map((h, i) => ({
      time: h.time,
      precipitationProbability: h.precipitationProbability,
      weatherCode: h.weatherCode,
      temperature: hourly.temperature_2m[startIndex + i] ?? null,
    })),
  };

  const isDaytimeNow =
    current_weather.time >= sunrise && current_weather.time < sunset;

  if (!isDaytimeNow) {
    const reason =
      current_weather.time < sunrise
        ? "todavía no amaneció, esperá a la mañana"
        : "ya se puso el sol, esperá a mañana";
    return NextResponse.json({
      decision: "NO",
      reason,
      score: 0,
      maxPrecipProbability: null,
      avgHumidity: null,
      avgWindSpeed: null,
      ...currentResponse,
    });
  }

  const windowHours = candidate.filter((h) => h.time <= sunset);
  const result = decide(windowHours);

  return NextResponse.json({ ...result, ...currentResponse });
}
