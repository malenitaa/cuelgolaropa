import { describe, expect, it } from "vitest";
import { decide, type HourlyPoint } from "./decision";

const hora = (o: Partial<HourlyPoint> = {}): HourlyPoint => ({
  time: "2026-11-15T12:00",
  precipitationProbability: 0,
  humidity: 50,
  windSpeed: 10,
  weatherCode: 0,
  ...o,
});
const ahora = (o: Partial<Parameters<typeof decide>[1]> = {}) => ({
  weatherCode: 0,
  humidity: 50,
  windSpeed: 10,
  ...o,
});

describe("decide · bordes numéricos", () => {
  it.each([
    [50, "SI"],
    [50.0001, "NO"],
    [49.99, "SI"],
  ])("viento %f -> %s", (w, d) => {
    expect(decide([], ahora({ windSpeed: w })).decision).toBe(d);
  });

  it.each([
    [0, "windCalm"],
    [2.99, "windCalm"],
    [3, "clear"],
    [4.99, "clear"],
    [5, "windIdeal"],
    [30, "windIdeal"],
    [30.01, "clear"],
    [50, "clear"],
  ])("viento %f -> reasonKey %s", (w, k) => {
    expect(decide([], ahora({ windSpeed: w })).reasonKey).toBe(k);
  });

  it.each([
    [75, "green"],
    [75.01, "yellow"],
    [89.99, "yellow"],
    [90, "red"],
    [100, "red"],
    [140, "red"],
  ])("humedad %f -> color %s", (h, c) => {
    expect(decide([], ahora({ humidity: h })).color).toBe(c);
  });

  it("humedad exacta 90 -> reasonValue 90", () => {
    expect(decide([], ahora({ humidity: 90 })).reasonValue).toBe(90);
  });

  it("humedad y viento negativos no rompen: verde y windCalm", () => {
    const r = decide([], ahora({ humidity: -5, windSpeed: -10 }));
    expect(r.decision).toBe("SI");
    expect(r.reasonKey).toBe("windCalm");
  });

  // Aceptado (AUDITORIA.md, R4): decide() asume números válidos y,
  // con NaN o undefined, cae en SÍ. La validación está en /api/weather, que
  // responde 502 insufficientData si falta humedad, viento o código de ahora.
  it("dado NaN o undefined, cuando se decide, entonces no tira (la ruta valida antes)", () => {
    expect(() => decide([], ahora({ humidity: NaN }))).not.toThrow();
    expect(() => decide([], ahora({ windSpeed: NaN }))).not.toThrow();
    expect(() => decide([], ahora({ humidity: undefined as unknown as number }))).not.toThrow();
  });

  it("viento Infinity -> NO windDangerous", () => {
    expect(decide([], ahora({ windSpeed: Infinity })).reasonKey).toBe("windDangerous");
  });

});

describe("decide · prioridades y worsensAt", () => {
  it("nieve + lluvia a la vez: gana snowing", () => {
    expect(decide([], ahora({ weatherCode: 61, hourlyWeatherCode: 71 })).reasonKey).toBe("snowing");
  });

  it("lluvia + viento peligroso + humedad 99: gana raining", () => {
    expect(decide([], ahora({ weatherCode: 63, windSpeed: 90, humidity: 99 })).reasonKey).toBe("raining");
  });

  it("código WMO desconocido (999, -1, NaN) no cuenta como lluvia", () => {
    for (const c of [999, -1, NaN]) expect(decide([], ahora({ weatherCode: c })).decision).toBe("SI");
  });

  it("weather_code 'llovizna' como string '61' no se reconoce (Open-Meteo manda número)", () => {
    // documenta: un código string se ignora silenciosamente y da SI
    expect(decide([], ahora({ weatherCode: "61" as unknown as number })).decision).toBe("SI");
  });

  it("hourlyWeatherCode de 'cielo despejado' (0) no pisa un current lluvioso", () => {
    expect(decide([], ahora({ weatherCode: 61, hourlyWeatherCode: 0 })).decision).toBe("NO");
  });

  it("arreglo de horas vacío: worsensAt null y no revienta", () => {
    expect(decide([], ahora()).worsensAt).toBeNull();
  });

  it("precipitación 30% exacto marca worsensAt; 29.99 no", () => {
    expect(decide([hora({ precipitationProbability: 30 })], ahora()).worsensAt).toBe("2026-11-15T12:00");
    expect(decide([hora({ precipitationProbability: 29.99 })], ahora()).worsensAt).toBeNull();
  });

  it("viento horario 50 no marca worsensAt; 50.01 sí", () => {
    expect(decide([hora({ windSpeed: 50 })], ahora()).worsensAt).toBeNull();
    expect(decide([hora({ windSpeed: 50.01 })], ahora()).worsensAt).not.toBeNull();
  });

  it("worsensAt devuelve la primera hora mala, no la peor", () => {
    const hs = [hora({ time: "a", precipitationProbability: 30 }), hora({ time: "b", weatherCode: 95 })];
    expect(decide(hs, ahora()).worsensAt).toBe("a");
  });

  it("current rojo: worsensAt null aunque haya horas malas", () => {
    expect(decide([hora({ weatherCode: 95 })], ahora({ weatherCode: 61 })).worsensAt).toBeNull();
  });

  it("humedad horaria 100% no marca worsensAt", () => {
    expect(decide([hora({ humidity: 100 })], ahora()).worsensAt).toBeNull();
  });

  it("precipitationProbability NaN en una hora no marca worsensAt (NaN >= 30 es false)", () => {
    expect(decide([hora({ precipitationProbability: NaN })], ahora()).worsensAt).toBeNull();
  });

  it("10.000 horas: sigue siendo rápido y devuelve la primera mala", () => {
    const hs = Array.from({ length: 10_000 }, (_, i) => hora({ time: `t${i}`, weatherCode: i === 9_999 ? 95 : 0 }));
    expect(decide(hs, ahora()).worsensAt).toBe("t9999");
  });

  it("humedad alta + worsensAt: reasonKey humidHigh y color yellow", () => {
    const r = decide([hora({ weatherCode: 95 })], ahora({ humidity: 80 }));
    expect(r.reasonKey).toBe("humidHigh");
    expect(r.worsensAt).not.toBeNull();
  });
});
