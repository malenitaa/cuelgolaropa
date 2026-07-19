import { NextRequest, NextResponse } from "next/server";

interface OpenMeteoResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoResult[];
}

// Abreviaturas/alias que la gente escribe pero que no aparecen tal cual en los
// campos admin1/admin2/country de Open-Meteo (que vienen de GeoNames). Open-Meteo
// traduce esos campos según `language`, así que incluimos las variantes en
// español e inglés sin importar qué idioma haya pedido el usuario.
const QUALIFIER_ALIASES: Record<string, string[]> = {
  caba: [
    "ciudad autonoma de buenos aires",
    "capital federal",
    "buenos aires f.d.",
    "autonomous city of buenos aires",
  ],
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const buildHaystack = (r: OpenMeteoResult) =>
  normalize(
    [r.name, r.admin1, r.admin2, r.admin3, r.country].filter(Boolean).join(" ")
  );

function findMatch(
  results: OpenMeteoResult[],
  qualifier: string | null
): OpenMeteoResult | null {
  if (!qualifier) return results[0] ?? null;
  const term = normalize(qualifier.replace(/,/g, " "));
  const terms = [term, ...(QUALIFIER_ALIASES[term] ?? [])];
  return (
    results.find((r) => {
      const haystack = buildHaystack(r);
      return terms.some((t) => haystack.includes(t));
    }) ?? null
  );
}

const FETCH_TIMEOUT_MS = 8_000;
const MAX_CITY_LENGTH = 200;
const MAX_WORD_ITERATIONS = 5;

async function searchOpenMeteo(
  name: string,
  lang: string
): Promise<OpenMeteoResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "100");
  url.searchParams.set("language", lang);
  url.searchParams.set("format", "json");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error("geocodeServiceError");
    }
    const data: OpenMeteoGeocodingResponse = await res.json();
    return data.results ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const lang = searchParams.get("lang") === "en" ? "en" : "es";

  if (!city) {
    return NextResponse.json({ errorKey: "missingCity" }, { status: 400 });
  }

  if (city.length > MAX_CITY_LENGTH) {
    return NextResponse.json({ errorKey: "missingCity" }, { status: 400 });
  }

  let match: OpenMeteoResult | null = null;

  try {
    const commaIndex = city.indexOf(",");
    if (commaIndex !== -1) {
      // "Palermo, CABA" / "Palermo, Buenos Aires" / "Palermo, Argentina"
      const namePart = city.slice(0, commaIndex).trim();
      const qualifierPart = city.slice(commaIndex + 1).trim();
      if (namePart) {
        const results = await searchOpenMeteo(namePart, lang);
        match = findMatch(results, qualifierPart || null);
      }
    } else {
      // Sin coma: probamos la frase completa y, si no matchea nada, vamos
      // sacando la última palabra del nombre y usándola como calificador
      // ("Palermo CABA" -> nombre "Palermo", calificador "CABA").
      // Capped at MAX_WORD_ITERATIONS to prevent O(n) upstream calls on long input.
      const words = city.split(/\s+/).filter(Boolean);
      const startIdx = Math.max(1, words.length - MAX_WORD_ITERATIONS + 1);
      for (let i = words.length; i >= startIdx && !match; i--) {
        const candidateName = words.slice(0, i).join(" ");
        const qualifier = i < words.length ? words.slice(i).join(" ") : null;
        const results = await searchOpenMeteo(candidateName, lang);
        if (results.length === 0) continue;
        match = findMatch(results, qualifier);
      }
    }
  } catch {
    return NextResponse.json(
      { errorKey: "geocodeServiceUnreachable" },
      { status: 502 }
    );
  }

  if (!match) {
    return NextResponse.json(
      { errorKey: "cityNotFound", detail: city },
      { status: 404 }
    );
  }

  return NextResponse.json({
    latitude: match.latitude,
    longitude: match.longitude,
    name: match.name,
    country: match.country ?? null,
    admin1: match.admin1 ?? null,
  });
}
