import type { DecisionColor } from "@/lib/decision";

export interface EasterEgg {
  labels: { es: string; en: string };
  decision: "SI" | "NO";
  color: DecisionColor;
  reason: { es: string; en: string };
  binaryMode?: boolean;
}

function normalizeCity(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function toBinary(text: string): string {
  return text
    .split("")
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");
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
  mordor: {
    labels: { es: "MORDOR, TIERRA MEDIA", en: "MORDOR, MIDDLE-EARTH" },
    decision: "NO",
    color: "red",
    reason: {
      es: "ceniza cayendo todo el día y el Ojo de Sauron no deja de vigilar el tender",
      en: "ash falling all day and the Eye of Sauron never stops watching the clothesline",
    },
  },
  gotham: {
    labels: { es: "GOTHAM CITY", en: "GOTHAM CITY" },
    decision: "NO",
    color: "red",
    reason: {
      es: "llueve el 90% del año y hay demasiados villanos sueltos como para salir al patio",
      en: "it rains 90% of the year and there are too many villains loose to go out to the yard",
    },
  },
  "gotham city": {
    labels: { es: "GOTHAM CITY", en: "GOTHAM CITY" },
    decision: "NO",
    color: "red",
    reason: {
      es: "llueve el 90% del año y hay demasiados villanos sueltos como para salir al patio",
      en: "it rains 90% of the year and there are too many villains loose to go out to the yard",
    },
  },
  wakanda: {
    labels: { es: "WAKANDA, REINO OCULTO", en: "WAKANDA, HIDDEN KINGDOM" },
    decision: "SI",
    color: "green",
    reason: {
      es: "el vibranium regula hasta el clima, secado garantizado en tiempo récord",
      en: "vibranium regulates even the weather, guaranteed record-time drying",
    },
  },
  themyscira: {
    labels: { es: "THEMYSCIRA, ISLA PARAÍSO", en: "THEMYSCIRA, PARADISE ISLAND" },
    decision: "SI",
    color: "green",
    reason: {
      es: "paraíso amazona, sol perfecto todo el año",
      en: "Amazon paradise, perfect sun all year round",
    },
  },
  "la comarca": {
    labels: { es: "LA COMARCA, TIERRA MEDIA", en: "THE SHIRE, MIDDLE-EARTH" },
    decision: "SI",
    color: "green",
    reason: {
      es: "clima campestre ideal, hasta los hobbits tienden afuera",
      en: "ideal countryside weather, even the hobbits hang laundry outside",
    },
  },
  "the shire": {
    labels: { es: "LA COMARCA, TIERRA MEDIA", en: "THE SHIRE, MIDDLE-EARTH" },
    decision: "SI",
    color: "green",
    reason: {
      es: "clima campestre ideal, hasta los hobbits tienden afuera",
      en: "ideal countryside weather, even the hobbits hang laundry outside",
    },
  },
  "bikini bottom": {
    labels: { es: "FONDO DE BIKINI", en: "BIKINI BOTTOM" },
    decision: "NO",
    color: "red",
    reason: {
      es: "está literal bajo el mar, ¿dónde vas a colgar algo ahí?",
      en: "it's literally under the sea, where are you even going to hang anything?",
    },
  },
  "fondo de bikini": {
    labels: { es: "FONDO DE BIKINI", en: "BIKINI BOTTOM" },
    decision: "NO",
    color: "red",
    reason: {
      es: "está literal bajo el mar, ¿dónde vas a colgar algo ahí?",
      en: "it's literally under the sea, where are you even going to hang anything?",
    },
  },
  "isla nublar": {
    labels: { es: "ISLA NUBLAR, COSTA RICA", en: "ISLA NUBLAR, COSTA RICA" },
    decision: "NO",
    color: "red",
    reason: {
      es: "hay velociraptores sueltos, mejor no arriesgues las medias",
      en: "there are velociraptors on the loose, better not risk your socks",
    },
  },
  atlantis: {
    labels: { es: "ATLÁNTIDA, FONDO DEL OCÉANO", en: "ATLANTIS, OCEAN FLOOR" },
    decision: "NO",
    color: "red",
    reason: {
      es: "sumergida hace siglos, la humedad es un problema menor comparado con ahogarte",
      en: "submerged for centuries, humidity is the least of your problems when you're drowning",
    },
  },
  atlantida: {
    labels: { es: "ATLÁNTIDA, FONDO DEL OCÉANO", en: "ATLANTIS, OCEAN FLOOR" },
    decision: "NO",
    color: "red",
    reason: {
      es: "sumergida hace siglos, la humedad es un problema menor comparado con ahogarte",
      en: "submerged for centuries, humidity is the least of your problems when you're drowning",
    },
  },
  "pais de las maravillas": {
    labels: { es: "PAÍS DE LAS MARAVILLAS", en: "WONDERLAND" },
    decision: "NO",
    color: "red",
    reason: {
      es: "el clima lo decreta la Reina de Corazones, y hoy amaneció de mal humor",
      en: "the Queen of Hearts decrees the weather, and she woke up in a bad mood today",
    },
  },
  wonderland: {
    labels: { es: "PAÍS DE LAS MARAVILLAS", en: "WONDERLAND" },
    decision: "NO",
    color: "red",
    reason: {
      es: "el clima lo decreta la Reina de Corazones, y hoy amaneció de mal humor",
      en: "the Queen of Hearts decrees the weather, and she woke up in a bad mood today",
    },
  },
  zion: {
    labels: { es: "ZION, ÚLTIMA CIUDAD HUMANA", en: "ZION, LAST HUMAN CITY" },
    decision: "NO",
    color: "red",
    reason: {
      es: "no hay cielo real aquí abajo, mejor tomate la pastilla roja",
      en: "there's no real sky down here, better take the red pill",
    },
    binaryMode: true,
  },
  matrix: {
    labels: { es: "ZION, ÚLTIMA CIUDAD HUMANA", en: "ZION, LAST HUMAN CITY" },
    decision: "NO",
    color: "red",
    reason: {
      es: "no hay cielo real aquí abajo, mejor tomate la pastilla roja",
      en: "there's no real sky down here, better take the red pill",
    },
    binaryMode: true,
  },
  genovia: {
    labels: { es: "GENOVIA, PRINCIPADO", en: "GENOVIA, PRINCIPALITY" },
    decision: "SI",
    color: "green",
    reason: {
      es: "principado de cuento con clima de postal, ni Mia Thermopolis lo arruinaría",
      en: "storybook principality with postcard weather, not even Mia Thermopolis could ruin it",
    },
  },
  coruscant: {
    labels: { es: "CORUSCANT, NÚCLEO GALÁCTICO", en: "CORUSCANT, GALACTIC CORE" },
    decision: "NO",
    color: "red",
    reason: {
      es: "ciudad-planeta 100% asfalto, no hay ni un patio",
      en: "a 100% paved city-planet, there isn't a single yard",
    },
  },
  "springfield simpsons": {
    labels: { es: "SPRINGFIELD", en: "SPRINGFIELD" },
    decision: "NO",
    color: "red",
    reason: {
      es: "hay una nube tóxica flotando desde la planta nuclear de Homero, mejor no arriesgues",
      en: "there's a toxic cloud drifting from Homer's nuclear plant, better not risk it",
    },
  },
  "nunca jamas": {
    labels: { es: "NUNCA JAMÁS, SEGUNDA ESTRELLA A LA DERECHA", en: "NEVERLAND, SECOND STAR TO THE RIGHT" },
    decision: "SI",
    color: "green",
    reason: {
      es: "eternamente niños, eternamente buen clima",
      en: "eternally young, eternally good weather",
    },
  },
  neverland: {
    labels: { es: "NUNCA JAMÁS, SEGUNDA ESTRELLA A LA DERECHA", en: "NEVERLAND, SECOND STAR TO THE RIGHT" },
    decision: "SI",
    color: "green",
    reason: {
      es: "eternamente niños, eternamente buen clima",
      en: "eternally young, eternally good weather",
    },
  },
};

export function findEasterEgg(city: string): EasterEgg | null {
  return EASTER_EGGS[normalizeCity(city)] ?? null;
}
