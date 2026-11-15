import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function pedido(query: string) {
  return new NextRequest(`http://localhost/api/weather?${query}`);
}

// Respuesta mínima de Open-Meteo: 4 días de horas desde el 15/11 a las 00:00.
function openMeteo(currentTime: string) {
  const horas = Array.from({ length: 96 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 15, i));
    return d.toISOString().slice(0, 13) + ":00";
  });
  return {
    current: {
      time: currentTime,
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

function stubFetch(impl: (input?: string | URL) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/weather", () => {
  it.each([
    ["", "missingCoords"],
    ["lat=-34.6", "missingCoords"],
    ["lat=abc&lon=1", "invalidCoords"],
    ["lat=91&lon=0", "invalidCoords"],
    ["lat=0&lon=-181", "invalidCoords"],
  ])("CA-10: dado '%s', cuando se pide, entonces 400 %s sin llamar a Open-Meteo", async (query, errorKey) => {
    const fetchMock = stubFetch(async () => Response.json({}));
    const res = await GET(pedido(query));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ errorKey });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CA-11: dado que Open-Meteo responde 500, cuando se pide, entonces 502 sin caché", async () => {
    stubFetch(async () => new Response("boom", { status: 500 }));
    const res = await GET(pedido("lat=-34.6&lon=-58.38"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ errorKey: "weatherServiceError" });
    expect(res.headers.get("cache-control")).toBeNull();
  });

  it("CA-11: dado que Open-Meteo no responde, cuando se pide, entonces 502 'unreachable'", async () => {
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });
    const res = await GET(pedido("lat=-34.6&lon=-58.38"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ errorKey: "weatherServiceUnreachable" });
  });

  it("CA-12: dado que Open-Meteo responde bien, cuando se pide, entonces 200 con decisión, 6 horas desde la que viene, 3 días y caché de 10 min", async () => {
    const fetchMock = stubFetch(async () => Response.json(openMeteo("2026-11-15T14:15")));
    const res = await GET(pedido("lat=-34.6&lon=-58.38"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=600");

    const body = await res.json();
    expect(body).toMatchObject({ decision: "SI", color: "green", current: { time: "2026-11-15T14:15", isDay: true } });
    expect(body.hourlyPreview).toHaveLength(6);
    expect(body.hourlyPreview[0]).toMatchObject({ time: "2026-11-15T15:00", temperature: 15 });
    expect(body.dailyPreview.map((d: { day: number }) => d.day)).toEqual([16, 17, 18]);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.hostname).toBe("api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe("-34.6");
  });

  it("CA-12: dado que la hora actual coincide con un balde horario, cuando se pide, entonces las horas arrancan en la siguiente", async () => {
    stubFetch(async () => Response.json(openMeteo("2026-11-15T14:00")));
    const body = await (await GET(pedido("lat=-34.6&lon=-58.38"))).json();
    expect(body.hourlyPreview[0].time).toBe("2026-11-15T15:00");
  });
});
