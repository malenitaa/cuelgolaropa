import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function pedido(city: string, extra = "") {
  const url = new URL("http://localhost/api/geocode");
  url.searchParams.set("city", city);
  return new NextRequest(url + extra);
}

const RES = { latitude: 1, longitude: 2, name: "Palermo", country: "Argentina", admin1: "Buenos Aires F.D." };

function stub(fn: (name: string, url: URL) => unknown) {
  const m = vi.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    const out = fn(url.searchParams.get("name") ?? "", url);
    return out instanceof Response ? out : Response.json(out);
  });
  vi.stubGlobal("fetch", m);
  return m;
}
const nombresBuscados = (m: ReturnType<typeof stub>) =>
  m.mock.calls.map((c) => new URL(String(c[0])).searchParams.get("name"));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GET /api/geocode · entrada de peor caso", () => {
  it.each([",", ",,,", " , , ", ", CABA", ",Buenos Aires"])(
    "ciudad %j sin nombre antes de la coma -> 404 sin llamar a Open-Meteo",
    async (city) => {
      const m = stub(() => ({ results: [RES] }));
      const res = await GET(pedido(city));
      expect([400, 404]).toContain(res.status);
      expect(m).not.toHaveBeenCalled();
    }
  );

  it("'Palermo,' (calificador vacío) devuelve el primer resultado", async () => {
    stub(() => ({ results: [RES] }));
    const res = await GET(pedido("Palermo,"));
    expect(res.status).toBe(200);
  });

  it("'Palermo,,,,CABA' no revienta y busca solo 'Palermo'", async () => {
    const m = stub(() => ({ results: [RES] }));
    const res = await GET(pedido("Palermo,,,,CABA"));
    expect(res.status).toBe(200);
    expect(nombresBuscados(m)).toEqual(["Palermo"]);
  });

  it("coma: el calificador que no matchea da 404, no cae al primer resultado", async () => {
    stub(() => ({ results: [RES] }));
    const res = await GET(pedido("Palermo, Narnia"));
    expect(res.status).toBe(404);
  });

  it("calificador con caracteres de regex/comodín ('.*', '(') no matchea todo ni explota", async () => {
    stub(() => ({ results: [RES] }));
    expect((await GET(pedido("Palermo, .*"))).status).toBe(404);
    expect((await GET(pedido("Palermo, ("))).status).toBe(404);
  });

  it("calificador 'CABA' con tildes/mayúsculas ('Cába') sigue matcheando por alias", async () => {
    stub(() => ({ results: [RES] }));
    expect((await GET(pedido("Palermo, CÁBA"))).status).toBe(200);
  });

  it("límite: 200 caracteres pasa y 201 da 400", async () => {
    const m = stub(() => ({ results: [RES] }));
    expect((await GET(pedido("a".repeat(200)))).status).not.toBe(400);
    m.mockClear();
    expect((await GET(pedido("a".repeat(201)))).status).toBe(400);
    expect(m).not.toHaveBeenCalled();
  });

  it("100 emojis (100 caracteres visibles, 200 code units) pasan; 101 emojis dan 400 (documenta que se cuentan code units)", async () => {
    stub(() => ({ results: [] }));
    expect((await GET(pedido("😀".repeat(100)))).status).toBe(404);
    expect((await GET(pedido("😀".repeat(101)))).status).toBe(400);
  });

  // Aceptado (AUDITORIA.md, B-3): el límite es de tamaño, en unidades UTF-16.
  it("150 emojis (300 unidades UTF-16) pasan el límite de 200 y dan 400 (aceptado)", async () => {
    stub(() => ({ results: [] }));
    const res = await GET(pedido("😀".repeat(150)));
    expect(res.status).toBe(400);
  });

  it("espacios no separables (U+00A0) alrededor cuentan como vacío -> 400", async () => {
    stub(() => ({ results: [RES] }));
    expect((await GET(pedido("  "))).status).toBe(400);
  });

  it("`city` repetido: usa el primero", async () => {
    const m = stub(() => ({ results: [RES] }));
    await GET(new NextRequest("http://localhost/api/geocode?city=Uno&city=Dos"));
    expect(nombresBuscados(m)).toEqual(["Uno"]);
  });

  it.each(["EN", "en ", "fr", "es&language=xx", "../../etc/passwd", "<script>", ""])(
    "lang=%j nunca se reenvía crudo: solo 'es' o 'en' llegan a Open-Meteo",
    async (lang) => {
      const m = stub(() => ({ results: [RES] }));
      await GET(new NextRequest(`http://localhost/api/geocode?city=Palermo&lang=${encodeURIComponent(lang)}`));
      const l = new URL(String((m.mock.calls[0] as unknown[])[0])).searchParams;
      expect(["es", "en"]).toContain(l.get("language"));
      expect(l.getAll("language")).toHaveLength(1);
    }
  );

  // Aceptado (AUDITORIA.md, B-3): la página siempre manda "es" o "en" en minúscula.
  it("lang=EN (mayúsculas) se trata como español (aceptado)", async () => {
    const m = stub(() => ({ results: [RES] }));
    await GET(new NextRequest("http://localhost/api/geocode?city=Palermo&lang=EN"));
    expect(new URL(String((m.mock.calls[0] as unknown[])[0])).searchParams.get("language")).toBe("es");
  });

  it("texto con '&', '#', '%', '../../etc/passwd', SQL y HTML viaja codificado como un solo parámetro name", async () => {
    const m = stub(() => ({ results: [] }));
    for (const c of ["a&count=1", "a#b", "100%", "../../etc/passwd", "'; DROP TABLE x;--", "<img src=x onerror=alert(1)>"]) {
      m.mockClear();
      await GET(pedido(c));
      const u = new URL(String((m.mock.calls[0] as unknown[])[0]));
      expect(u.hostname).toBe("geocoding-api.open-meteo.com");
      expect(u.searchParams.getAll("name")).toHaveLength(1);
      expect(u.searchParams.get("count")).toBe("100");
    }
  });

  it("el 404 hace eco de `detail` con HTML: se devuelve como JSON (no text/html)", async () => {
    stub(() => ({ results: [] }));
    const res = await GET(pedido("<script>alert(1)</script>"));
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("404 y 400 no llevan Cache-Control público de un día", async () => {
    stub(() => ({ results: [] }));
    const r404 = await GET(pedido("zzzz"));
    expect(r404.headers.get("cache-control") ?? "").not.toContain("86400");
  });

  it("sin coma, 12 palabras: máximo 5 llamadas a Open-Meteo", async () => {
    const m = stub(() => ({ results: [] }));
    await GET(pedido("a b c d e f g h i j k l"));
    expect(m.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("sin coma, 100 palabras de 1 letra (199 chars): máximo 5 llamadas", async () => {
    const m = stub(() => ({ results: [] }));
    await GET(pedido(Array(100).fill("a").join(" ")));
    expect(m.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("sin coma: 'Palermo   CABA' (espacios múltiples y tabs) se normaliza", async () => {
    const m = stub((n) => ({ results: n === "Palermo" ? [RES] : [] }));
    const res = await GET(pedido("Palermo \t  CABA"));
    expect(res.status).toBe(200);
    expect(nombresBuscados(m)).toContain("Palermo");
  });

  it("una sola palabra sin resultados -> 404 con 1 sola llamada", async () => {
    const m = stub(() => ({ results: [] }));
    expect((await GET(pedido("x"))).status).toBe(404);
    expect(m).toHaveBeenCalledTimes(1);
  });

  it("unicode combinado (e + U+0301) y precompuesto se tratan igual en el calificador", async () => {
    stub(() => ({ results: [{ ...RES, admin1: "Córdoba" }] }));
    expect((await GET(pedido("Palermo, Córdoba"))).status).toBe(200);
  });

  it("RTL, cero ancho y emoji como ciudad no explotan (404)", async () => {
    stub(() => ({ results: [] }));
    for (const c of ["مدينة", "​​", "🏙️", "a\u0000b", "Zalgò́̂̃"]) {
      const res = await GET(pedido(c));
      expect([400, 404]).toContain(res.status);
    }
  });

  // Aceptado (AUDITORIA.md, B-3): trim() no saca el ancho cero; se busca y da 404.
  it("\\u200b (ancho cero) solo se busca y da 404 (aceptado)", async () => {
    const m = stub(() => ({ results: [] }));
    const res = await GET(pedido("​"));
    expect(res.status).toBe(404);
    expect(m).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/geocode · Open-Meteo devuelve cosas raras", () => {
  it.each([429, 500])("status %i -> 502 geocodeServiceUnreachable", async (s) => {
    stub(() => new Response("{}", { status: s }));
    const res = await GET(pedido("Palermo"));
    expect(res.status).toBe(502);
  });

  it("200 con HTML -> 502", async () => {
    stub(() => new Response("<html></html>", { status: 200 }));
    expect((await GET(pedido("Palermo"))).status).toBe(502);
  });

  it.each([null, [], "texto", 5, { results: null }, { results: {} }, { results: "x" }])(
    "cuerpo %j no produce 500 sin atrapar",
    async (cuerpo) => {
      stub(() => cuerpo);
      const res = await GET(pedido("Palermo"));
      expect([200, 404, 502]).toContain(res.status);
    }
  );

  it("results: null (Open-Meteo lo manda así a veces) -> 404, no 502", async () => {
    stub(() => ({ results: null }));
    expect((await GET(pedido("Palermo"))).status).toBe(404);
  });

  it("resultado sin latitude/longitude -> no se responde 200 con coordenadas ausentes", async () => {
    stub(() => ({ results: [{ name: "Palermo" }] }));
    const res = await GET(pedido("Palermo"));
    if (res.status === 200) {
      const j = await res.json();
      expect(typeof j.latitude).toBe("number");
      expect(typeof j.longitude).toBe("number");
    }
  });

  it("resultado con campos de otro tipo (name numérico, admin1 objeto) no revienta", async () => {
    stub(() => ({ results: [{ latitude: 1, longitude: 2, name: 123, admin1: { x: 1 }, country: [] }] }));
    const res = await GET(pedido("Palermo, algo"));
    expect([200, 404, 502]).toContain(res.status);
    expect(res.headers.get("content-type")).toContain("json");
  });

  it("elemento `null` dentro de results -> no revienta", async () => {
    stub(() => ({ results: [null, RES] }));
    const res = await GET(pedido("Palermo, Argentina"));
    expect(res.status).toBe(200);
  });

  it("sin coma, la 2ª llamada falla con 500 tras 1ª sin resultados -> 502", async () => {
    let n = 0;
    stub(() => (n++ === 0 ? { results: [] } : new Response("", { status: 500 })));
    expect((await GET(pedido("Palermo CABA"))).status).toBe(502);
  });

  it("respuesta con 10.000 resultados duplicados no revienta y devuelve el primero que matchea", async () => {
    stub(() => ({ results: Array.from({ length: 10_000 }, () => RES) }));
    const res = await GET(pedido("Palermo, Argentina"));
    expect(res.status).toBe(200);
  });

  it("200 lleva s-maxage=86400", async () => {
    stub(() => ({ results: [RES] }));
    expect((await GET(pedido("Palermo"))).headers.get("cache-control")).toBe("public, s-maxage=86400");
  });

  it("timeout: se aborta a los 8 s y responde 502", async () => {
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
    const p = GET(pedido("Palermo"));
    await vi.advanceTimersByTimeAsync(7_999);
    expect(senal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(senal?.aborted).toBe(true);
    expect((await p).status).toBe(502);
  });

  it("sin coma con 5 llamadas colgadas: el peor caso total no se acumula (5 x 8 s = 40 s)", async () => {
    vi.useFakeTimers();
    let llamadas = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((_u: unknown, init?: RequestInit) => {
        llamadas++;
        return new Promise((_, rej) => {
          init?.signal?.addEventListener("abort", () => rej(new DOMException("abort", "AbortError")));
        });
      })
    );
    const p = GET(pedido("a b c d e f"));
    await vi.advanceTimersByTimeAsync(8_001);
    const res = await p;
    // un timeout ya es fatal (catch externo): no se reintenta con la siguiente palabra
    expect(res.status).toBe(502);
    expect(llamadas).toBe(1);
  });
});
