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
  hogwarts: {
    labels: { es: "HOGWARTS, ESCOCIA MÁGICA", en: "HOGWARTS, MAGICAL SCOTLAND" },
    decision: "NO",
    color: "red",
    reason: {
      es: "hay dementores rondando la torre, la humedad emocional es insoportable",
      en: "dementors are circling the tower, the emotional humidity is unbearable",
    },
  },
  "muy muy lejano": {
    labels: { es: "MUY MUY LEJANO, REINO DE CUENTO", en: "FAR FAR AWAY, FAIRY TALE KINGDOM" },
    decision: "SI",
    color: "green",
    reason: {
      es: "en el reino todo sale siempre bien, hasta la ropa se seca con final feliz",
      en: "everything always works out in the kingdom, even laundry gets a happy ending",
    },
  },
  "far far away": {
    labels: { es: "MUY MUY LEJANO, REINO DE CUENTO", en: "FAR FAR AWAY, FAIRY TALE KINGDOM" },
    decision: "SI",
    color: "green",
    reason: {
      es: "en el reino todo sale siempre bien, hasta la ropa se seca con final feliz",
      en: "everything always works out in the kingdom, even laundry gets a happy ending",
    },
  },
  asgard: {
    labels: { es: "ASGARD, REINO ETERNO", en: "ASGARD, REALM ETERNAL" },
    decision: "NO",
    color: "red",
    reason: {
      es: "⚡ Thor está de mal humor y hay tormenta en todo el Bifröst",
      en: "⚡ Thor's in a bad mood, storming across the whole Bifröst",
    },
  },
  narnia: {
    labels: { es: "NARNIA, DETRÁS DEL ROPERO", en: "NARNIA, THROUGH THE WARDROBE" },
    decision: "NO",
    color: "red",
    reason: {
      es: "❄️ siempre invierno y nunca Navidad, ni sueñes con que se seque",
      en: "❄️ always winter and never Christmas, don't even dream it'll dry",
    },
  },
  "ciudad esmeralda": {
    labels: { es: "CIUDAD ESMERALDA, TIERRA DE OZ", en: "EMERALD CITY, LAND OF OZ" },
    decision: "SI",
    color: "green",
    reason: {
      es: "seguí el camino de baldosas amarillas, hoy no hay tornados a la vista",
      en: "follow the yellow brick road, no tornadoes in sight today",
    },
  },
  "emerald city": {
    labels: { es: "CIUDAD ESMERALDA, TIERRA DE OZ", en: "EMERALD CITY, LAND OF OZ" },
    decision: "SI",
    color: "green",
    reason: {
      es: "seguí el camino de baldosas amarillas, hoy no hay tornados a la vista",
      en: "follow the yellow brick road, no tornadoes in sight today",
    },
  },
  "el dorado": {
    labels: { es: "EL DORADO, CIUDAD PERDIDA", en: "EL DORADO, LOST CITY" },
    decision: "SI",
    color: "green",
    reason: {
      es: "ciudad dorada de sol eterno, la ropa se seca antes de encontrarla en el mapa",
      en: "golden city under an endless sun, laundry dries before you even find it on a map",
    },
  },
  eldorado: {
    labels: { es: "EL DORADO, CIUDAD PERDIDA", en: "EL DORADO, LOST CITY" },
    decision: "SI",
    color: "green",
    reason: {
      es: "ciudad dorada de sol eterno, la ropa se seca antes de encontrarla en el mapa",
      en: "golden city under an endless sun, laundry dries before you even find it on a map",
    },
  },
};

export function findEasterEgg(city: string): EasterEgg | null {
  return EASTER_EGGS[normalizeCity(city)] ?? null;
}
