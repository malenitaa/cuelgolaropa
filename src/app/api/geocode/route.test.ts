import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function pedido(city: string, lang = "es") {
  const url = new URL("http://localhost/api/geocode");
  url.searchParams.set("city", city);
  url.searchParams.set("lang", lang);
  return new NextRequest(url);
}

const PALERMO_SICILIA = { latitude: 38.1, longitude: 13.3, name: "Palermo", country: "Italia", admin1: "Sicilia" };
const PALERMO_CABA = {
  latitude: -34.58,
  longitude: -58.43,
  name: "Palermo",
  country: "Argentina",
  admin1: "Buenos Aires F.D.",
};

// Open-Meteo devuelve resultados según el nombre buscado.
function stubOpenMeteo(porNombre: Record<string, object[]>) {
  const fetchMock = vi.fn(async (input: string | URL) => {
    const name = new URL(String(input)).searchParams.get("name") ?? "";
    return Response.json({ results: porNombre[name] });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/geocode", () => {
  it("CA-13: dada una ciudad vacía o de más de 200 caracteres, cuando se pide, entonces 400 sin llamar a Open-Meteo", async () => {
    const fetchMock = stubOpenMeteo({});
    expect((await GET(new NextRequest("http://localhost/api/geocode"))).status).toBe(400);
    expect((await GET(pedido("   "))).status).toBe(400);
    expect((await GET(pedido("a".repeat(201)))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CA-14: dado 'Palermo, CABA', cuando se pide, entonces elige el Palermo de Buenos Aires por el alias de CABA", async () => {
    stubOpenMeteo({ Palermo: [PALERMO_SICILIA, PALERMO_CABA] });
    const res = await GET(pedido("Palermo, CABA"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      latitude: -34.58,
      longitude: -58.43,
      name: "Palermo",
      country: "Argentina",
      admin1: "Buenos Aires F.D.",
    });
  });

  it("CA-14: dado 'Palermo CABA' sin coma, cuando se pide, entonces prueba la frase y después usa la última palabra como calificador", async () => {
    const fetchMock = stubOpenMeteo({ Palermo: [PALERMO_SICILIA, PALERMO_CABA] });
    const body = await (await GET(pedido("Palermo CABA"))).json();
    expect(body.country).toBe("Argentina");
    const nombres = fetchMock.mock.calls.map(([u]) => new URL(String(u)).searchParams.get("name"));
    expect(nombres).toEqual(["Palermo CABA", "Palermo"]);
  });

  it("CA-15: dada una búsqueda sin coma de muchas palabras que no existe, cuando se pide, entonces hace a lo sumo 5 llamadas", async () => {
    const fetchMock = stubOpenMeteo({});
    const res = await GET(pedido("uno dos tres cuatro cinco seis siete ocho"));
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("CA-16: dada una ciudad que no existe, cuando se pide, entonces 404 cityNotFound con caché de 5 min", async () => {
    stubOpenMeteo({});
    const res = await GET(pedido("Xqzwv"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ errorKey: "cityNotFound", detail: "Xqzwv" });
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=300");
  });

  it("CA-29: dada una búsqueda, cuando se llama a Open-Meteo, entonces usa la caché de datos de un día", async () => {
    const fetchMock = stubOpenMeteo({ Rosario: [{ latitude: -32.95, longitude: -60.64, name: "Rosario" }] });
    await GET(pedido("Rosario"));
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit & { next?: { revalidate?: number } };
    expect(init.next?.revalidate).toBe(86400);
    expect(init.cache).toBeUndefined();
  });

  it("CA-16: dado que Open-Meteo falla, cuando se pide, entonces 502", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const res = await GET(pedido("Rosario"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ errorKey: "geocodeServiceUnreachable" });
  });

  it("CA-17: dada una ciudad encontrada, cuando se pide, entonces 200 con caché de un día y pide el idioma correcto", async () => {
    const fetchMock = stubOpenMeteo({ Rosario: [{ latitude: -32.95, longitude: -60.64, name: "Rosario" }] });
    const res = await GET(pedido("Rosario", "en"));
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=86400");
    expect(await res.json()).toMatchObject({ name: "Rosario", country: null, admin1: null });
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("language")).toBe("en");
  });
});
