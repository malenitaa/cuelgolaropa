import { ImageResponse } from "next/og";
import { decide, type HourlyPoint } from "@/lib/decision";
import { REASONS } from "@/lib/i18n";

export const alt = "¿Cuelgo la ropa hoy?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Regenera la imagen una vez por día en vez de en cada request, para no
// pegarle a Open-Meteo por cada link compartido y para que quede cacheada
// en la CDN; el trade-off es que puede mostrar el resultado de hasta 24hs atrás.
export const revalidate = 86400;

// La card social no puede saber la ubicación de quien la ve, así que usa
// Buenos Aires como ciudad representativa (coincide con el es_AR del sitio).
const BA_LATITUDE = -34.6037;
const BA_LONGITUDE = -58.3816;

const COLOR_HEX = {
  green: "#10b981",
  yellow: "#fbbf24",
  red: "#e11d48",
} as const;

interface OpenMeteoResponse {
  current: {
    time: string;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  hourly: {
    time: string[];
    precipitation_probability: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    weather_code: number[];
  };
}

async function getBuenosAiresDecision() {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(BA_LATITUDE));
  url.searchParams.set("longitude", String(BA_LONGITUDE));
  url.searchParams.set(
    "current",
    "relative_humidity_2m,weather_code,wind_speed_10m"
  );
  url.searchParams.set(
    "hourly",
    "precipitation_probability,relative_humidity_2m,wind_speed_10m,weather_code"
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("weather service error");
  const data: OpenMeteoResponse = await res.json();

  let startIndex = data.hourly.time.findIndex((t) => t >= data.current.time);
  if (startIndex === -1) startIndex = 0;
  if (data.hourly.time[startIndex] === data.current.time) startIndex += 1;

  const laterHours: HourlyPoint[] = data.hourly.time
    .slice(startIndex, startIndex + 8)
    .map((time, i) => ({
      time,
      precipitationProbability:
        data.hourly.precipitation_probability[startIndex + i] ?? 0,
      humidity: data.hourly.relative_humidity_2m[startIndex + i] ?? 0,
      windSpeed: data.hourly.wind_speed_10m[startIndex + i] ?? 0,
      weatherCode: data.hourly.weather_code[startIndex + i] ?? 0,
    }));

  return decide(laterHours, {
    weatherCode: data.current.weather_code,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
  });
}

export default async function Image() {
  let word = "SÍ";
  let color: keyof typeof COLOR_HEX = "green";
  let reasonText = "cielo despejado y humedad baja";

  try {
    const result = await getBuenosAiresDecision();
    word = result.decision === "SI" ? "SÍ" : "NO";
    color = result.color;
    reasonText = REASONS.es[result.reasonKey](result.reasonValue);
  } catch {
    // Si Open-Meteo falla durante la generación, mostramos una card
    // genérica en vez de romper la preview del link.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLOR_HEX[color],
          color: color === "yellow" ? "#18181b" : "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            opacity: 0.85,
            letterSpacing: 2,
          }}
        >
          BUENOS AIRES, ARGENTINA
        </div>
        <div style={{ display: "flex", fontSize: 260, fontWeight: 900, lineHeight: 1, marginTop: 8 }}>
          {word}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 500,
            marginTop: 8,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {reasonText}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            opacity: 0.7,
            marginTop: 40,
          }}
        >
          cuelgolaropa.ar
        </div>
      </div>
    ),
    { ...size }
  );
}
