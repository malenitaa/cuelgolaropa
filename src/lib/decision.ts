export interface HourlyPoint {
  time: string;
  precipitationProbability: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

export interface DecisionResult {
  decision: "SI" | "NO";
  reason: string;
  score: number;
  maxPrecipProbability: number;
  avgHumidity: number;
  avgWindSpeed: number;
}

const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;

/**
 * Puntaje simple 0-100 (más alto = mejor para secar). Reglas if/then sobre
 * la ventana de horas relevante (próximas 6-8h de luz solar), no ML.
 * Asume que windowHours ya está recortada a horas con luz solar: si ahora
 * es de noche, el caller debe devolver NO directamente sin llamar a esto.
 */
export function decide(windowHours: HourlyPoint[]): DecisionResult {
  const maxPrecipProbability = Math.max(
    ...windowHours.map((h) => h.precipitationProbability)
  );
  const avgHumidity = avg(windowHours.map((h) => h.humidity));
  const avgWindSpeed = avg(windowHours.map((h) => h.windSpeed));

  let score = 100;
  const penalties: { amount: number; reason: string }[] = [];
  const bonuses: { amount: number; reason: string }[] = [];

  if (maxPrecipProbability >= 30) {
    penalties.push({
      amount: 50,
      reason: `${Math.round(maxPrecipProbability)}% de probabilidad de lluvia`,
    });
  } else if (maxPrecipProbability >= 15) {
    penalties.push({
      amount: 20,
      reason: `${Math.round(maxPrecipProbability)}% de probabilidad de lluvia`,
    });
  }

  if (avgHumidity > 75) {
    penalties.push({
      amount: 25,
      reason: `humedad muy alta (${Math.round(avgHumidity)}%)`,
    });
  } else if (avgHumidity > 60) {
    penalties.push({
      amount: 10,
      reason: `humedad alta (${Math.round(avgHumidity)}%)`,
    });
  }

  if (avgWindSpeed >= 5 && avgWindSpeed <= 30) {
    bonuses.push({ amount: 10, reason: "viento ideal para secar" });
  } else if (avgWindSpeed < 3) {
    penalties.push({ amount: 5, reason: "casi no hay viento" });
  } else if (avgWindSpeed > 50) {
    penalties.push({ amount: 10, reason: "viento demasiado fuerte" });
  }

  for (const p of penalties) score -= p.amount;
  for (const b of bonuses) score += b.amount;
  score = Math.max(0, Math.min(100, score));

  const decisionValue: "SI" | "NO" = score >= 50 ? "SI" : "NO";

  let reason: string;
  if (decisionValue === "NO") {
    const worst = penalties.reduce((a, b) => (b.amount > a.amount ? b : a));
    reason = worst.reason;
  } else if (bonuses.length > 0) {
    reason = bonuses[0].reason;
  } else if (maxPrecipProbability < 15 && avgHumidity <= 60) {
    reason = "cielo despejado y humedad baja";
  } else {
    reason = "condiciones favorables";
  }

  return {
    decision: decisionValue,
    reason,
    score,
    maxPrecipProbability,
    avgHumidity,
    avgWindSpeed,
  };
}
