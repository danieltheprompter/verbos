export const MOODS = [
  { id: "indicative", label: "Indicative" },
  { id: "subjunctive", label: "Subjunctive" },
  { id: "commands", label: "Commands" },
];

export const TARGET_GROUPS = [
  {
    id: "indicative",
    label: "Indicative",
    items: [
      { id: "presente", label: "Presente", boardLabel: "Presente", mood: "indicative", time: "presente" },
      { id: "preterito", label: "Pretérito", boardLabel: "Pretérito", mood: "indicative", time: "preterito" },
      { id: "imperfecto", label: "Imperfecto", boardLabel: "Imperfecto", mood: "indicative", time: "imperfecto" },
      { id: "futuro", label: "Futuro", boardLabel: "Futuro", mood: "indicative", time: "futuro" },
      { id: "condicional", label: "Condicional", boardLabel: "Condicional", mood: "indicative", time: "condicional" },
    ],
  },
  {
    id: "subjunctive",
    label: "Subjunctive",
    items: [
      { id: "subjuntivo", label: "Presente", boardLabel: "Presente de subjuntivo", mood: "subjunctive", time: "presente" },
      { id: "subjuntivo_imp", label: "Imperfecto", boardLabel: "Imperfecto de subjuntivo", mood: "subjunctive", time: "imperfecto" },
    ],
  },
  {
    id: "commands",
    label: "Commands",
    items: [
      { id: "mandato_af", label: "Afirmativo", boardLabel: "Afirmativo", mood: "commands", time: "affirmative" },
      { id: "mandato_neg", label: "Negativo", boardLabel: "Negativo", mood: "commands", time: "negative" },
    ],
  },
];

export const TENSES = TARGET_GROUPS.flatMap((group) => group.items);

export const TENSE_BY_ID = Object.fromEntries(TENSES.map((tense) => [tense.id, tense]));

export function moodOf(tense) {
  return TENSE_BY_ID[tense]?.mood ?? "indicative";
}

export function timeOf(tense) {
  return TENSE_BY_ID[tense]?.time ?? tense;
}

export function timesForMood(mood) {
  return TARGET_GROUPS.find((group) => group.id === mood)?.items ?? [];
}

export const PERSONS = [
  { id: "yo", label: "yo", column: "yo" },
  { id: "tu", label: "tú", column: "tu" },
  { id: "vos", label: "vos", column: "vos" },
  { id: "el", label: "él / ella / usted", column: "el" },
  { id: "nos", label: "nosotros", column: "nos" },
  { id: "vosotros", label: "vosotros", column: "vosotros" },
  { id: "ellos", label: "ellos / ellas / ustedes", column: "ellos" },
];

export const BOARD_NOTE =
  "This board is this round. A square fills when you answer. Right or wrong shows on what you typed.";

export const FARM_NOTE =
  "These are forms you already know. Add another time or kind of verb.";

export const DEFAULT_TENSES = ["presente", "preterito"];
export const DEFAULT_PERSONS = ["yo", "tu", "el", "nos", "ellos"];
export const ROUND_SIZE = 10;
export const CONTENT_VERSION = "v1";

export const POOL = {
  REGULARS: 1,
  IRREGULARS: 2,
  STEM: 3,
};

export const VERB_BUCKETS = [
  { id: "regular", label: "Regulars", examples: "hablar" },
  { id: "irregular", label: "High-frequency irregulars", examples: "ser, ir, tener" },
  { id: "stem", label: "Stem-changing", examples: "pensar, volver" },
  { id: "spelling", label: "Spelling-change", examples: "llegar, sacar" },
];

export const VERB_TYPES = VERB_BUCKETS;

export const ENDING_PATTERNS = [
  { id: "ar", label: "-ar" },
  { id: "er_ir", label: "-er / -ir" },
];

export const FORM_STATE = {
  not_enough: "not_enough",
  learning: "learning",
  know: "know",
};

export const FORM_COPY = {
  not_enough: "not enough yet",
  learning: "still learning",
  know: "you know this",
};

export function typesFromLegacyPool(pool) {
  if (pool >= POOL.STEM) return VERB_BUCKETS.map((bucket) => bucket.id);
  if (pool >= POOL.IRREGULARS) return ["regular", "irregular"];
  return ["regular"];
}

export function isCommand(tense) {
  return tense === "mandato_af" || tense === "mandato_neg";
}

export const DEFAULT_SETTINGS = {
  types: ["regular"],
  tenses: [...DEFAULT_TENSES],
  address: "tu",
  vosotros: false,
  pickedVerbs: [],
  customList: "",
  timer: false,
  timerSec: 12,
  mc: false,
};

export const MASTERY_WINDOW = 7;
export const MASTERY_NEED = 5;
export const MASTERY_MIN = 5;

export const STORAGE_KEY = "verbos.v1";
