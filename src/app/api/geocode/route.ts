import { NextRequest, NextResponse } from "next/server";

interface OpenMeteoGeocodingResponse {
  results?: {
    latitude: number;
    longitude: number;
    name: string;
    country?: string;
    admin1?: string;
  }[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const lang = searchParams.get("lang") === "en" ? "en" : "es";

  if (!city) {
    return NextResponse.json({ errorKey: "missingCity" }, { status: 400 });
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", lang);
  url.searchParams.set("format", "json");

  let data: OpenMeteoGeocodingResponse;
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { errorKey: "geocodeServiceError" },
        { status: 502 }
      );
    }
    data = await res.json();
  } catch {
    return NextResponse.json(
      { errorKey: "geocodeServiceUnreachable" },
      { status: 502 }
    );
  }

  const match = data.results?.[0];
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
