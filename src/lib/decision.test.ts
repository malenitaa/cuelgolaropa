import { describe, expect, it } from "vitest";
import { decide, type CurrentConditions, type HourlyPoint } from "@/lib/decision";

const DESPEJADO = 0;
const NUBLADO = 3;
const LLUVIA = 61;
const NIEVE = 71;

function ahora(overrides: Partial<CurrentConditions> = {}): CurrentConditions {
  return { weatherCode: DESPEJADO, humidity: 50, windSpeed: 15, ...overrides };
}

function hora(time: string, overrides: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time,
    precipitationProbability: 0,
    humidity: 50,
    windSpeed: 15,
    weatherCode: DESPEJADO,
    ...overrides,
  };
}

describe("decide", () => {
  it("CA-1: dado que llueve ahora, cuando se decide, entonces NO por lluvia", () => {
    const r = decide([], ahora({ weatherCode: LLUVIA }));
    expect(r).toMatchObject({ decision: "NO", color: "red", reasonKey: "raining", reasonValue: null });
  });

  it("CA-2: dado que nieva ahora, cuando se decide, entonces NO por nieve, aunque además llueva en el horario", () => {
    const r = decide([], ahora({ weatherCode: NIEVE, hourlyWeatherCode: LLUVIA }));
    expect(r).toMatchObject({ decision: "NO", reasonKey: "snowing" });
  });

  it("CA-3: dado current nublado y el horario de esta hora con lluvia, cuando se decide, entonces NO por lluvia", () => {
    const r = decide([], ahora({ weatherCode: NUBLADO, hourlyWeatherCode: LLUVIA }));
    expect(r).toMatchObject({ decision: "NO", reasonKey: "raining" });
  });

  it("CA-4: dado viento de más de 50 km/h, cuando se decide, entonces NO por viento peligroso", () => {
    expect(decide([], ahora({ windSpeed: 50.1 })).reasonKey).toBe("windDangerous");
    expect(decide([], ahora({ windSpeed: 50 })).decision).toBe("SI");
  });

  // Open-Meteo devuelve la humedad en enteros. Con un decimal (89,6) saldría
  // SÍ amarillo con el texto "90 %"; no pasa con datos reales (AUDITORIA.md, B-5).
  it("CA-5: dada humedad de 90 % o más, cuando se decide, entonces NO con el porcentaje", () => {
    expect(decide([], ahora({ humidity: 90 }))).toMatchObject({ decision: "NO", reasonKey: "humidExtreme", reasonValue: 90 });
    expect(decide([], ahora({ humidity: 89 })).decision).toBe("SI");
  });

  it("CA-6: dada humedad entre 76 y 89 %, cuando se decide, entonces SÍ amarillo por humedad alta", () => {
    const r = decide([], ahora({ humidity: 80 }));
    expect(r).toMatchObject({ decision: "SI", color: "yellow", reasonKey: "humidHigh", reasonValue: 80 });
    expect(decide([], ahora({ humidity: 75 })).color).toBe("green");
  });

  it("CA-7: dado seco, humedad baja y viento de 5 a 30 km/h, cuando se decide, entonces SÍ verde por viento ideal", () => {
    expect(decide([], ahora({ windSpeed: 5 }))).toMatchObject({ decision: "SI", color: "green", reasonKey: "windIdeal" });
    expect(decide([], ahora({ windSpeed: 30 })).reasonKey).toBe("windIdeal");
    expect(decide([], ahora({ windSpeed: 2 })).reasonKey).toBe("windCalm");
    expect(decide([], ahora({ windSpeed: 40 })).reasonKey).toBe("clear");
  });

  it("CA-8: dado que ahora se puede y más tarde llueve, cuando se decide, entonces SÍ amarillo con la hora en que empeora", () => {
    const horas = [
      hora("2026-11-15T14:00"),
      hora("2026-11-15T15:00", { weatherCode: LLUVIA }),
      hora("2026-11-15T16:00", { windSpeed: 60 }),
    ];
    expect(decide(horas, ahora())).toMatchObject({
      decision: "SI",
      color: "yellow",
      worsensAt: "2026-11-15T15:00",
    });
  });

  it("CA-8: dada una probabilidad de lluvia de 30 % más tarde, cuando se decide, entonces avisa que empeora", () => {
    const horas = [hora("2026-11-15T14:00", { precipitationProbability: 29 }), hora("2026-11-15T15:00", { precipitationProbability: 30 })];
    expect(decide(horas, ahora()).worsensAt).toBe("2026-11-15T15:00");
  });

  it("CA-9: dado que la humedad sube de noche sin lluvia, cuando se decide, entonces no avisa que empeora", () => {
    const horas = [hora("2026-11-15T22:00", { humidity: 98 }), hora("2026-11-15T23:00", { humidity: 99 })];
    expect(decide(horas, ahora())).toMatchObject({ color: "green", worsensAt: null });
  });

  it("dado que ya es NO, cuando también empeora más tarde, entonces worsensAt queda en null", () => {
    const horas = [hora("2026-11-15T15:00", { weatherCode: LLUVIA })];
    expect(decide(horas, ahora({ weatherCode: LLUVIA })).worsensAt).toBeNull();
  });
});
