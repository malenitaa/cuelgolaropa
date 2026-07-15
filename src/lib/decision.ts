export interface HourlyPoint {
  time: string;
  precipitationProbability: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

export type DecisionColor = "green" | "yellow" | "red";

export interface DecisionResult {
  decision: "SI" | "NO";
  color: DecisionColor;
  reason: string;
  maxPrecipProbability: number;
  avgHumidity: number;
  avgWindSpeed: number;
}

const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;

// Códigos WMO de precipitación activa (llovizna, lluvia, chaparrones, tormenta).
const RAINING_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);

/**
 * Reglas if/then simples, no ML. Tres niveles según lluvia y humedad:
 * - rojo (NO): ya está lloviendo o hay buena chance de que llueva.
 * - amarillo (SÍ, con cuidado): no llueve pero la humedad es alta, tarda en secar.
 * - verde (SÍ): no llueve y la humedad es baja/media.
 * El viento no cambia el color, solo ajusta el motivo mostrado.
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
  const windDescription =
    avgWindSpeed >= 5 && avgWindSpeed <= 30
      ? "viento ideal para secar"
      : avgWindSpeed < 3
        ? "casi no hay viento"
        : avgWindSpeed > 50
          ? "viento demasiado fuerte"
          : null;

  if (isRainingNow || maxPrecipProbability >= 30) {
    return {
      decision: "NO",
      color: "red",
      reason: isRainingNow
        ? "ya está lloviendo"
        : `${Math.round(maxPrecipProbability)}% de probabilidad de lluvia`,
      maxPrecipProbability,
      avgHumidity,
      avgWindSpeed,
    };
  }

  if (avgHumidity > 75 || maxPrecipProbability >= 15) {
    return {
      decision: "SI",
      color: "yellow",
      reason:
        avgHumidity > 75
          ? `humedad muy alta (${Math.round(avgHumidity)}%), va a tardar en secar`
          : `${Math.round(maxPrecipProbability)}% de probabilidad de lluvia más tarde`,
      maxPrecipProbability,
      avgHumidity,
      avgWindSpeed,
    };
  }

  return {
    decision: "SI",
    color: "green",
    reason: windDescription ?? "cielo despejado y humedad baja",
    maxPrecipProbability,
    avgHumidity,
    avgWindSpeed,
  };
}
