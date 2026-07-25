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
  // Hora (ISO) de la primera hora en la ventana "later" que empeoraría a rojo,
  // o null si no se detectó ninguna. Solo se completa cuando la decisión
  // principal es SI, para avisar "andá tendiendo ahora, pero traé la ropa
  // antes de tal hora".
  worsensAt: string | null;
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

// Cuántas horas de la ventana cuentan como "ahora" para la decisión principal.
// El resto de la ventana (hasta WINDOW_SIZE) solo se usa para avisar que va a
// empeorar más tarde, no para tapar un buen momento actual con un promedio
// de horas futuras.
const NEAR_TERM_HOURS = 3;

/**
 * Reglas if/then simples, no ML. Tres niveles según lluvia, viento y humedad:
 * - rojo (NO): ya está lloviendo o nevando, el viento es peligroso, hay buena
 *   chance de lluvia, o la humedad es tan extrema (≥90%) que la ropa
 *   prácticamente no seca.
 * - amarillo (SÍ, con cuidado): no llueve pero la humedad es alta, tarda en secar.
 * - verde (SÍ): no llueve, el viento no es peligroso, y la humedad es baja/media.
 * Devuelve una reasonKey (no texto) para que el cliente la traduzca al idioma activo.
 *
 * La decisión principal (SI/NO, color) sale solo de las primeras
 * NEAR_TERM_HOURS horas: "hace sol y viento ahora" no debería quedar tapado
 * por "va a estar nublado dentro de 6 horas". El resto de la ventana
 * (laterHours) se revisa aparte solo para detectar si en algún momento
 * posterior aparecerían las mismas condiciones de rojo, y en ese caso se
 * informa la hora en worsensAt sin bajar a NO la decisión de ahora.
 */
export function decide(
  windowHours: HourlyPoint[],
  currentWeatherCode: number
): DecisionResult {
  const nearTermHours = windowHours.slice(0, NEAR_TERM_HOURS);
  const laterHours = windowHours.slice(NEAR_TERM_HOURS);

  const maxPrecipProbability = Math.max(
    ...nearTermHours.map((h) => h.precipitationProbability)
  );
  const avgHumidity = avg(nearTermHours.map((h) => h.humidity));
  const avgWindSpeed = avg(nearTermHours.map((h) => h.windSpeed));

  const isRainingNow = RAINING_CODES.has(currentWeatherCode);
  const isSnowingNow = SNOWING_CODES.has(currentWeatherCode);
  const isDangerousWind = avgWindSpeed > DANGEROUS_WIND_KMH;
  const worsensAt = findWorsenTime(laterHours);

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
      worsensAt: null,
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
      worsensAt,
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
    color: worsensAt ? "yellow" : "green",
    reasonKey: windReasonKey ?? "clear",
    reasonValue: null,
    worsensAt,
    maxPrecipProbability,
    avgHumidity,
    avgWindSpeed,
  };
}

function findWorsenTime(hours: HourlyPoint[]): string | null {
  const bad = hours.find(
    (h) =>
      RAINING_CODES.has(h.weatherCode) ||
      SNOWING_CODES.has(h.weatherCode) ||
      h.windSpeed > DANGEROUS_WIND_KMH ||
      h.precipitationProbability >= 30 ||
      h.humidity >= 90
  );
  return bad ? bad.time : null;
}
