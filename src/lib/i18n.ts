import type { ReasonKey } from "@/lib/decision";

export type Lang = "es" | "en";

export const WEEKDAY_LETTERS: Record<Lang, string[]> = {
  es: ["D", "L", "M", "M", "J", "V", "S"],
  en: ["S", "M", "T", "W", "T", "F", "S"],
};

export const REASONS: Record<
  Lang,
  Record<ReasonKey, (value: number | null) => string>
> = {
  es: {
    raining: () => "ya está lloviendo",
    snowing: () => "está nevando",
    windDangerous: () => "🌪️ viento peligroso, no cuelgues la ropa",
    humidExtreme: (v) => `humedad extrema (${v}%), no va a secar`,
    humidHigh: (v) => `humedad muy alta (${v}%), va a tardar en secar`,
    windIdeal: () => "viento ideal para secar",
    windCalm: () => "casi no hay viento",
    clear: () => "cielo despejado y humedad baja",
  },
  en: {
    raining: () => "it's raining right now",
    snowing: () => "it's snowing right now",
    windDangerous: () => "🌪️ dangerous wind, don't hang your laundry",
    humidExtreme: (v) => `extreme humidity (${v}%), it won't dry`,
    humidHigh: (v) => `very high humidity (${v}%), it'll take a while to dry`,
    windIdeal: () => "good drying breeze",
    windCalm: () => "barely any wind",
    clear: () => "clear skies and low humidity",
  },
};

export const LATER_WARNING: Record<Lang, (time: string) => string> = {
  es: (time) => `Va a empeorar después de las ${time} — traé la ropa antes.`,
  en: (time) => `It'll get worse after ${time} — bring your laundry in before then.`,
};

export type ErrorKey =
  | "missingCoords"
  | "invalidCoords"
  | "weatherServiceError"
  | "weatherServiceUnreachable"
  | "insufficientData"
  | "missingCity"
  | "geocodeServiceUnreachable"
  | "cityNotFound"
  | "networkError";

export const ERRORS: Record<
  Lang,
  Record<ErrorKey, (detail?: string) => string>
> = {
  es: {
    missingCoords: () => "Faltan los parámetros de ubicación.",
    invalidCoords: () => "Ubicación inválida.",
    weatherServiceError: () => "El servicio de clima no respondió correctamente.",
    weatherServiceUnreachable: () => "No se pudo contactar al servicio de clima.",
    insufficientData: () => "El servicio de clima no devolvió datos suficientes.",
    missingCity: () => "Falta el nombre de la ciudad.",
    geocodeServiceUnreachable: () => "No se pudo contactar al servicio de ubicación.",
    cityNotFound: (city) => `No se encontró la ciudad "${city}".`,
    networkError: () => "No se pudo conectar. Revisá tu conexión.",
  },
  en: {
    missingCoords: () => "Missing location parameters.",
    invalidCoords: () => "Invalid location.",
    weatherServiceError: () => "The weather service didn't respond correctly.",
    weatherServiceUnreachable: () => "Couldn't reach the weather service.",
    insufficientData: () => "The weather service didn't return enough data.",
    missingCity: () => "Missing city name.",
    geocodeServiceUnreachable: () => "Couldn't reach the location service.",
    cityNotFound: (city) => `Couldn't find the city "${city}".`,
    networkError: () => "Couldn't connect. Check your internet connection.",
  },
};

export const UI: Record<
  Lang,
  {
    pageTitle: string;
    locating: string;
    loadingWeather: string;
    needCityPrompt: string;
    cityPlaceholder: string;
    go: string;
    retryCity: string;
    tryAnotherCity: string;
    viewNextDays: string;
    canHang: string;
    cannotHang: string;
    yes: string;
    no: string;
    dataBy: string;
  }
> = {
  es: {
    pageTitle: "¿Cuelgo la ropa hoy?",
    locating: "Buscando tu ubicación…",
    loadingWeather: "Consultando el clima…",
    needCityPrompt: "No pudimos usar tu ubicación. ¿En qué ciudad estás?",
    cityPlaceholder: "Ej: Rosario",
    go: "Ir",
    retryCity: "Probar con otra ciudad",
    tryAnotherCity: "Probar otra ciudad",
    viewNextDays: "Ver próximos 3 días",
    canHang: "Podés colgar la ropa",
    cannotHang: "Mejor no cuelgues la ropa",
    yes: "SÍ",
    no: "NO",
    dataBy: "Según",
  },
  en: {
    pageTitle: "Should I hang my laundry today?",
    locating: "Finding your location…",
    loadingWeather: "Checking the weather…",
    needCityPrompt: "We couldn't use your location. What city are you in?",
    cityPlaceholder: "E.g: Chicago",
    go: "Go",
    retryCity: "Try another city",
    tryAnotherCity: "Try another city",
    viewNextDays: "See next 3 days",
    canHang: "You can hang your laundry",
    cannotHang: "Better not hang your laundry",
    yes: "YES",
    no: "NO",
    dataBy: "Based on",
  },
};

export function detectLang(): Lang {
  if (typeof navigator === "undefined") return "es";
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}
