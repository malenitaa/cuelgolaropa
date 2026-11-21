import { NextRequest, NextResponse } from "next/server";
import { decide, type HourlyPoint } from "@/lib/decision";

interface OpenMeteoForecastResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
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

const roundCoord = (n: number) => Math.round(n * 100) / 100;

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

  // Redondeo a ~1 km acá también (la página ya lo hace): así un decimal de más
  // o un parámetro basura terminan en la misma URL y en la caché de datos.
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(roundCoord(latitude)));
  url.searchParams.set("longitude", String(roundCoord(longitude)));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day"
  );
  url.searchParams.set(
    "hourly",
    "precipitation_probability,relative_humidity_2m,wind_speed_10m,weather_code,temperature_2m"
  );
  url.searchParams.set("daily", "weather_code");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "4");

  let data: OpenMeteoForecastResponse;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Next guarda en su caché de datos solo las respuestas 200, por URL.
    const res = await fetch(url.toString(), {
      next: { revalidate: 600 },
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

  // Open-Meteo puede responder 200 con otra forma, o un proxy devolver
  // cualquier cosa: sin la estructura mínima, es un error del servicio.
  if (!hasForecastShape(data)) {
    return NextResponse.json(
      { errorKey: "weatherServiceError" },
      { status: 502 }
    );
  }

  const { current, hourly, daily } = data;

  // Sin humedad, viento o código de ahora, las reglas dirían SÍ con datos
  // que faltan; mejor no responder.
  if (
    !Number.isFinite(current.relative_humidity_2m) ||
    !Number.isFinite(current.wind_speed_10m) ||
    !Number.isFinite(current.weather_code)
  ) {
    return NextResponse.json(
      { errorKey: "insufficientData" },
      { status: 502 }
    );
  }

  let startIndex = hourly.time.findIndex((t) => t >= current.time);
  if (startIndex === -1) startIndex = 0;
  // `current` ya cubre "ahora" con una lectura real; si el pronóstico horario
  // tiene un balde que coincide con esa misma hora, lo salteamos para que
  // laterHours arranque estrictamente después de ahora.
  if (hourly.time[startIndex] === current.time) startIndex += 1;

  // El weather_code de `current` a veces no detecta llovizna/nevisca liviana
  // que el balde horario correspondiente a esta misma hora sí marca (reporta
  // "nublado" mientras hourly ya tiene código de lluvia). Se lo pasa a decide
  // como respaldo.
  const currentHourTime = current.time.slice(0, 13) + ":00";
  const currentHourIndex = hourly.time.indexOf(currentHourTime);
  const hourlyWeatherCodeNow =
    currentHourIndex !== -1 ? hourly.weather_code[currentHourIndex] : undefined;

  const laterHours: HourlyPoint[] = hourly.time
    .slice(startIndex, startIndex + WINDOW_SIZE)
    .map((time, i) => ({
      time,
      precipitationProbability:
        hourly.precipitation_probability[startIndex + i] ?? 0,
      humidity: hourly.relative_humidity_2m[startIndex + i] ?? 0,
      windSpeed: hourly.wind_speed_10m[startIndex + i] ?? 0,
      weatherCode: hourly.weather_code[startIndex + i] ?? 0,
    }));

  const result = decide(laterHours, {
    weatherCode: current.weather_code,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    hourlyWeatherCode: hourlyWeatherCodeNow,
  });

  return NextResponse.json({
    ...result,
    current: {
      time: current.time,
      temperature: current.temperature_2m,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
    },
    hourlyPreview: laterHours.slice(0, 6).map((h, i) => ({
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
  }, {
    // La página redondea las coordenadas a ~1 km, así que visitas cercanas
    // piden la misma URL y la CDN la sirve sin volver a llamar a Open-Meteo.
    headers: { "Cache-Control": "public, s-maxage=600" },
  });
}

function hasForecastShape(data: unknown): data is OpenMeteoForecastResponse {
  if (typeof data !== "object" || data === null) return false;
  const { current, hourly, daily } = data as Partial<OpenMeteoForecastResponse>;
  return (
    typeof current?.time === "string" &&
    Array.isArray(hourly?.time) &&
    Array.isArray(daily?.time)
  );
}
