import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function pedido(query: string) {
  return new NextRequest(`http://localhost/api/weather?${query}`);
}

function base() {
  const horas = Array.from({ length: 96 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 15, i));
    return d.toISOString().slice(0, 13) + ":00";
  });
  return {
    current: {
      time: "2026-11-15T10:15",
      temperature_2m: 20,
      relative_humidity_2m: 50,
      weather_code: 0,
      wind_speed_10m: 15,
      is_day: 1,
    },
    hourly: {
      time: horas,
      precipitation_probability: horas.map(() => 0),
      relative_humidity_2m: horas.map(() => 50),
      wind_speed_10m: horas.map(() => 15),
      weather_code: horas.map(() => 0),
      temperature_2m: horas.map((_, i) => i),
    },
    daily: {
      time: ["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"],
      weather_code: [0, 1, 61, 3],
    },
  };
}

function stubJson(body: unknown, init?: ResponseInit) {
  const m = vi.fn(async () => Response.json(body, init));
  vi.stubGlobal("fetch", m);
  return m;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GET /api/weather · coordenadas de peor caso", () => {
  it.each(["Infinity", "-Infinity", "NaN", "abc", "1e2", "91", "-90.0001"])(
    "lat=%s se rechaza con 400 invalidCoords sin llamar afuera",
    async (lat) => {
      const m = stubJson(base());
      const res = await GET(pedido(`lat=${lat}&lon=0`));
      expect(res.status).toBe(400);
      expect(m).not.toHaveBeenCalled();
    }
  );

  it.each(["181", "1e3", "Infinity", "-180.5"])(
    "lon=%s se rechaza con 400",
    async (lon) => {
      const m = stubJson(base());
      expect((await GET(pedido(`lat=0&lon=${lon}`))).status).toBe(400);
      expect(m).not.toHaveBeenCalled();
    }
  );

  // Aceptado (AUDITORIA.md, B-1): la página siempre manda decimales; estas formas raras dan coordenadas válidas.
  it("lat y lon de solo espacios (%20) se interpretan como 0,0 (aceptado)", async () => {
    stubJson(base());
    const res = await GET(pedido("lat=%20&lon=%20"));
    expect(res.status).toBe(200);
  });

  it("notación hexadecimal 0x10 se interpreta como 16 (aceptado)", async () => {
    stubJson(base());
    const res = await GET(pedido("lat=0x10&lon=0x10"));
    expect(res.status).toBe(200);
  });

  it("notación científica 1e1 se interpreta como 10 (aceptado)", async () => {
    stubJson(base());
    const res = await GET(pedido("lat=1e1&lon=1e1"));
    expect(res.status).toBe(200);
  });

  it("lat=-0 se manda a Open-Meteo como 0 (no '-0')", async () => {
    const m = stubJson(base());
    await GET(pedido("lat=-0&lon=-0"));
    const url = new URL(String((m.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.get("latitude")).toBe("0");
    expect(url.searchParams.get("longitude")).toBe("0");
  });

  it("parámetros repetidos: usa el primero y manda un solo latitude", async () => {
    const m = stubJson(base());
    const res = await GET(pedido("lat=10&lat=999&lon=20&lon=-999"));
    expect(res.status).toBe(200);
    const url = new URL(String((m.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.getAll("latitude")).toEqual(["10"]);
    expect(url.searchParams.getAll("longitude")).toEqual(["20"]);
  });

  it("inyección en lat ('0&hourly=x') no llega a Open-Meteo", async () => {
    const m = stubJson(base());
    const res = await GET(pedido("lat=0%26forecast_days%3D999&lon=0"));
    expect(res.status).toBe(400);
    expect(m).not.toHaveBeenCalled();
  });

  it("límites exactos -90/90 y -180/180 se aceptan", async () => {
    stubJson(base());
    expect((await GET(pedido("lat=90&lon=180"))).status).toBe(200);
    expect((await GET(pedido("lat=-90&lon=-180"))).status).toBe(200);
  });

  it("coordenadas con 400 caracteres de dígitos no revientan", async () => {
    stubJson(base());
    const res = await GET(pedido(`lat=${"1".repeat(400)}&lon=0`));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/weather · Open-Meteo devuelve cosas raras", () => {
  it("200 con cuerpo HTML -> 502 con errorKey, no 500", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>cloudflare</html>", { status: 200 })));
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(502);
    expect((await res.json()).errorKey).toBeTruthy();
  });

  it.each([429, 500, 503])("status %i -> 502 weatherServiceError", async (s) => {
    stubJson({ reason: "x" }, { status: s });
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(502);
    expect((await res.json()).errorKey).toBe("weatherServiceError");
  });

  it("fetch rechaza (red caída) -> 502 weatherServiceUnreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(502);
    expect((await res.json()).errorKey).toBe("weatherServiceUnreachable");
  });

  it("JSON `null` como cuerpo -> 502 con JSON, no excepción sin atrapar", async () => {
    stubJson(null);
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(502);
  });

  it("JSON `{}` (sin current/hourly/daily) -> 502 con JSON, no excepción sin atrapar", async () => {
    stubJson({});
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(502);
  });

  it("Open-Meteo con error 200 {error:true, reason} -> 502 con JSON", async () => {
    stubJson({ error: true, reason: "Latitude must be in range" });
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(502);
  });

  it("falta `current` -> 502 con JSON, no excepción sin atrapar", async () => {
    const b = base() as Record<string, unknown>;
    delete b.current;
    stubJson(b);
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(502);
  });

  it("falta `daily` -> no revienta", async () => {
    const b = base() as Record<string, unknown>;
    delete b.daily;
    stubJson(b);
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBeLessThan(600);
    expect(res.headers.get("content-type")).toContain("json");
  });

  it("falta `hourly` -> no revienta", async () => {
    const b = base() as Record<string, unknown>;
    delete b.hourly;
    stubJson(b);
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.headers.get("content-type")).toContain("json");
  });

  it("current.time no es string (null) -> no revienta", async () => {
    const b = base();
    (b.current as { time: unknown }).time = null;
    stubJson(b);
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.headers.get("content-type")).toContain("json");
  });

  it("hourly con arrays vacíos -> 200, laterHours vacío, sin NaN", async () => {
    const b = base();
    b.hourly = { time: [], precipitation_probability: [], relative_humidity_2m: [], wind_speed_10m: [], weather_code: [], temperature_2m: [] };
    stubJson(b);
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.hourlyPreview).toEqual([]);
    expect(j.worsensAt).toBeNull();
  });

  it("arrays horarios más cortos que `time`: faltantes caen a 0 y temperature a null", async () => {
    const b = base();
    b.hourly.precipitation_probability = [];
    b.hourly.temperature_2m = [];
    stubJson(b);
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.hourlyPreview.every((h: { temperature: unknown; precipitationProbability: number }) => h.temperature === null && h.precipitationProbability === 0)).toBe(true);
  });

  // Aceptado (AUDITORIA.md, B-2): solo pasa si Open-Meteo manda datos incoherentes.
  it("hourly.time sin ninguna hora >= current.time: cae al principio de la ventana (aceptado)", async () => {
    const b = base();
    b.current.time = "2026-12-31T23:00"; // posterior a toda la ventana
    stubJson(b);
    const res = await GET(pedido("lat=1&lon=1"));
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j.hourlyPreview[0].time).toBe(b.hourly.time[0]);
  });

  it("current.time exacto en hora (10:00): salta ese balde, la preview arranca 11:00", async () => {
    const b = base();
    b.current.time = "2026-11-15T10:00";
    stubJson(b);
    const j = await (await GET(pedido("lat=1&lon=1"))).json();
    expect(j.hourlyPreview[0].time).toBe("2026-11-15T11:00");
  });

  it("current.time a las 23:30 del último día: no revienta y no repite la hora actual", async () => {
    const b = base();
    b.current.time = "2026-11-18T23:00"; // último balde
    stubJson(b);
    const res = await GET(pedido("lat=1&lon=1"));
    expect(res.status).toBe(200);
    expect((await res.json()).hourlyPreview).toEqual([]);
  });

  it("daily con solo 1 día -> dailyPreview vacío", async () => {
    const b = base();
    b.daily = { time: ["2026-11-15"], weather_code: [0] };
    stubJson(b);
    const j = await (await GET(pedido("lat=1&lon=1"))).json();
    expect(j.dailyPreview).toEqual([]);
  });

  // Aceptado (AUDITORIA.md, B-2): la página muestra 🌡️ para un código que falta.
  it("daily.weather_code más corto que time: el weatherCode que falta no viaja en el JSON (aceptado)", async () => {
    const b = base();
    b.daily.weather_code = [0];
    stubJson(b);
    const j = await (await GET(pedido("lat=1&lon=1"))).json();
    expect(j.dailyPreview[0].weatherCode).toBeUndefined();
  });

  it("daily.time con fecha basura ('mañana'): day y weekdayIndex no son NaN", async () => {
    const b = base();
    b.daily.time = ["2026-11-15", "mañana", "???", "x"];
    stubJson(b);
    const j = await (await GET(pedido("lat=1&lon=1"))).json();
    for (const d of j.dailyPreview) {
      expect(Number.isNaN(d.day)).toBe(false);
      expect(Number.isNaN(d.weekdayIndex)).toBe(false);
    }
  });

  it("humedad/viento de current como null (Open-Meteo a veces manda null): la decisión no sale verde con datos faltantes", async () => {
    const b = base();
    (b.current as { relative_humidity_2m: unknown }).relative_humidity_2m = null;
    (b.current as { wind_speed_10m: unknown }).wind_speed_10m = null;
    stubJson(b);
    const res = await GET(pedido("lat=1&lon=1"));
    const j = await res.json();
    expect(res.status).toBe(502);
    expect(j).toEqual({ errorKey: "insufficientData" });
  });

  it("viento peligroso en el horario con precip 30% exacto marca worsensAt", async () => {
    const b = base();
    b.hourly.precipitation_probability[12] = 30;
    stubJson(b);
    const j = await (await GET(pedido("lat=1&lon=1"))).json();
    expect(j.worsensAt).toBe(b.hourly.time[12]);
  });

  it("la respuesta 200 lleva s-maxage=600 y las de error no", async () => {
    stubJson(base());
    expect((await GET(pedido("lat=1&lon=1"))).headers.get("cache-control")).toBe("public, s-maxage=600");
    stubJson({}, { status: 500 });
    expect((await GET(pedido("lat=1&lon=1"))).headers.get("cache-control") ?? "").not.toContain("s-maxage");
  });

  it("timeout: si Open-Meteo no responde en 8 s se aborta la señal y se devuelve 502", async () => {
    vi.useFakeTimers();
    let senal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_u: unknown, init?: RequestInit) => {
        senal = init?.signal ?? undefined;
        return new Promise((_, rej) => {
          senal?.addEventListener("abort", () => rej(new DOMException("abort", "AbortError")));
        });
      })
    );
    const p = GET(pedido("lat=1&lon=1"));
    await vi.advanceTimersByTimeAsync(7_999);
    expect(senal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(senal?.aborted).toBe(true);
    const res = await p;
    expect(res.status).toBe(502);
    expect((await res.json()).errorKey).toBe("weatherServiceUnreachable");
  });

  it("el cuerpo que se cuelga después de los headers (res.json() lento) también corta a los 8 s", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: unknown, init?: RequestInit) => ({
        ok: true,
        json: () =>
          new Promise((_, rej) => {
            init?.signal?.addEventListener("abort", () => rej(new DOMException("abort", "AbortError")));
          }),
      }))
    );
    const p = GET(pedido("lat=1&lon=1"));
    await vi.advanceTimersByTimeAsync(8_001);
    expect((await p).status).toBe(502);
  });
});
