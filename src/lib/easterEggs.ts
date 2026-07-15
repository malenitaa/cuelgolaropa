import type { DecisionColor } from "@/lib/decision";

export interface EasterEgg {
  labels: { es: string; en: string };
  decision: "SI" | "NO";
  color: DecisionColor;
  reason: { es: string; en: string };
}

function normalizeCity(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const EASTER_EGGS: Record<string, EasterEgg> = {
  melmac: {
    labels: { es: "MELMAC, GALAXIA LEJANA", en: "MELMAC, DISTANT GALAXY" },
    decision: "NO",
    color: "red",
    reason: {
      es: "el planeta voló por los aires en una guerra nuclear, no queda dónde colgar nada",
      en: "the planet blew up in a nuclear war, nowhere left to hang anything",
    },
  },
  tatooine: {
    labels: { es: "TATOOINE, BORDE EXTERIOR", en: "TATOOINE, OUTER RIM" },
    decision: "SI",
    color: "green",
    reason: {
      es: "dos soles y humedad cero, se seca en lo que tarda en pasar un podracer",
      en: "twin suns and zero humidity, dries faster than a podrace",
    },
  },
  tatuine: {
    labels: { es: "TATOOINE, BORDE EXTERIOR", en: "TATOOINE, OUTER RIM" },
    decision: "SI",
    color: "green",
    reason: {
      es: "dos soles y humedad cero, se seca en lo que tarda en pasar un podracer",
      en: "twin suns and zero humidity, dries faster than a podrace",
    },
  },
  hoth: {
    labels: { es: "HOTH, SISTEMA HOTH", en: "HOTH, HOTH SYSTEM" },
    decision: "NO",
    color: "red",
    reason: {
      es: "-60°C y tauntauns helados dando vueltas, ni loco",
      en: "-60°C with frozen tauntauns wandering around, not a chance",
    },
  },
  vulcano: {
    labels: { es: "VULCANO, ESPACIO FEDERACIÓN", en: "VULCAN, FEDERATION SPACE" },
    decision: "SI",
    color: "green",
    reason: {
      es: "calor vulcano y lógica perfecta para secar en tiempo récord",
      en: "Vulcan heat and perfectly logical drying conditions",
    },
  },
  vulcan: {
    labels: { es: "VULCANO, ESPACIO FEDERACIÓN", en: "VULCAN, FEDERATION SPACE" },
    decision: "SI",
    color: "green",
    reason: {
      es: "calor vulcano y lógica perfecta para secar en tiempo récord",
      en: "Vulcan heat and perfectly logical drying conditions",
    },
  },
  neptuno: {
    labels: { es: "NEPTUNO, SISTEMA SOLAR", en: "NEPTUNE, SOLAR SYSTEM" },
    decision: "NO",
    color: "red",
    reason: {
      es: "ahí llueven diamantes de verdad, mejor no arriesgues la ropa",
      en: "it literally rains diamonds there, better not risk your laundry",
    },
  },
  neptune: {
    labels: { es: "NEPTUNO, SISTEMA SOLAR", en: "NEPTUNE, SOLAR SYSTEM" },
    decision: "NO",
    color: "red",
    reason: {
      es: "ahí llueven diamantes de verdad, mejor no arriesgues la ropa",
      en: "it literally rains diamonds there, better not risk your laundry",
    },
  },
};

export function findEasterEgg(city: string): EasterEgg | null {
  return EASTER_EGGS[normalizeCity(city)] ?? null;
}
