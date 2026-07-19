import { NextRequest, NextResponse } from "next/server";

interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

const FETCH_TIMEOUT_MS = 8_000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const lang = searchParams.get("lang") === "en" ? "en" : "es";

  if (!lat || !lon) {
    return NextResponse.json({ errorKey: "missingCoords" }, { status: 400 });
  }

  const latitude = Number(lat);
  const longitude = Number(lon);
  if (
    Number.isNaN(latitude) || Number.isNaN(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return NextResponse.json({ errorKey: "invalidCoords" }, { status: 400 });
  }

  const url = new URL(
    "https://api.bigdatacloud.net/data/reverse-geocode-client"
  );
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("localityLanguage", lang);

  let data: BigDataCloudResponse;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    });
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
  } finally {
    clearTimeout(timer);
  }

  return NextResponse.json({
    name: data.city || data.locality || null,
    admin1: data.principalSubdivision || null,
    country: data.countryName || null,
  });
}
