import { NextRequest, NextResponse } from "next/server";

interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const lang = searchParams.get("lang") === "en" ? "en" : "es";

  if (!lat || !lon) {
    return NextResponse.json({ errorKey: "missingCoords" }, { status: 400 });
  }

  const url = new URL(
    "https://api.bigdatacloud.net/data/reverse-geocode-client"
  );
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set("localityLanguage", lang);

  let data: BigDataCloudResponse;
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

  return NextResponse.json({
    name: data.city || data.locality || null,
    admin1: data.principalSubdivision || null,
    country: data.countryName || null,
  });
}
