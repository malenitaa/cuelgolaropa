export interface HourlyPoint {
  time: string;
  precipitationProbability: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

export type DecisionColor = "green" | "yellow" | "red";

export type ReasonKey =
  | "raining"
  | "snowing"
  | "windDangerous"
  | "rainProb"
  | "humidExtreme"
  | "humidHigh"
  | "rainLater"
  | "windIdeal"
  | "windCalm"
  | "clear";

export interface DecisionResult {
  decision: "SI" | "NO";
  color: DecisionColor;
  reasonKey: ReasonKey;
  reasonValue: number | null;
  maxPrecipProbability: number;
  avgHumidity: number;
  avgWindSpeed: number;
}

const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;

// Códigos WMO de precipitación activa (llovizna, lluvia, chaparrones, tormenta,
// incluye granizo: 96 y 99 son tormenta con granizo).
const RAINING_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);

// Códigos WMO de nieve activa (nevada, chaparrones de nieve).
const SNOWING_CODES = new Set([71, 73, 75, 77, 85, 86]);

// A partir de acá el viento puede volar/romper la ropa tendida (vendavales,
// rachas de tormenta, huracanes, tifones), no solo "no ayuda a secar".
const DANGEROUS_WIND_KMH = 50;

/**
 * Reglas if/then simples, no ML. Tres niveles según lluvia, viento y humedad:
 * - rojo (NO): ya está lloviendo o nevando, el viento es peligroso, hay buena
 *   chance de lluvia, o la humedad es tan extrema (≥90%) que la ropa
 *   prácticamente no seca.
 * - amarillo (SÍ, con cuidado): no llueve pero la humedad es alta, tarda en secar.
 * - verde (SÍ): no llueve, el viento no es peligroso, y la humedad es baja/media.
 * Devuelve una reasonKey (no texto) para que el cliente la traduzca al idioma activo.
 */
export function decide(
  windowHours: HourlyPoint[],
  currentWeatherCode: number
): DecisionResult {
  const maxPrecipProbability = Math.max(
    ...windowHours.map((h) => h.precipitationProbability)
  );
  const avgHumidity = avg(windowHours.map((h) => h.humidity));
  const avgWindSpeed = avg(windowHours.map((h) => h.windSpeed));

  const isRainingNow = RAINING_CODES.has(currentWeatherCode);
  const isSnowingNow = SNOWING_CODES.has(currentWeatherCode);
  const isDangerousWind = avgWindSpeed > DANGEROUS_WIND_KMH;

  if (
    isRainingNow ||
    isSnowingNow ||
    isDangerousWind ||
    maxPrecipProbability >= 30 ||
    avgHumidity >= 90
  ) {
    return {
      decision: "NO",
      color: "red",
      reasonKey: isSnowingNow
        ? "snowing"
        : isRainingNow
          ? "raining"
          : isDangerousWind
            ? "windDangerous"
            : avgHumidity >= 90
              ? "humidExtreme"
              : "rainProb",
      reasonValue:
        isSnowingNow || isRainingNow || isDangerousWind
          ? null
          : avgHumidity >= 90
            ? Math.round(avgHumidity)
            : Math.round(maxPrecipProbability),
      maxPrecipProbability,
      avgHumidity,
      avgWindSpeed,
    };
  }

  if (avgHumidity > 75 || maxPrecipProbability >= 15) {
    return {
      decision: "SI",
      color: "yellow",
      reasonKey: avgHumidity > 75 ? "humidHigh" : "rainLater",
      reasonValue:
        avgHumidity > 75
          ? Math.round(avgHumidity)
          : Math.round(maxPrecipProbability),
      maxPrecipProbability,
      avgHumidity,
      avgWindSpeed,
    };
  }

  const windReasonKey: ReasonKey | null =
    avgWindSpeed >= 5 && avgWindSpeed <= 30
      ? "windIdeal"
      : avgWindSpeed < 3
        ? "windCalm"
        : null;

  return {
    decision: "SI",
    color: "green",
    reasonKey: windReasonKey ?? "clear",
    reasonValue: null,
    maxPrecipProbability,
    avgHumidity,
    avgWindSpeed,
  };
}
