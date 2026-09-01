export const TENSES = [
  { id: "presente", label: "Presente", short: "Pres." },
  { id: "preterito", label: "Pretérito", short: "Pret." },
  { id: "imperfecto", label: "Imperfecto", short: "Imp." },
  { id: "futuro", label: "Futuro", short: "Fut." },
  { id: "condicional", label: "Condicional", short: "Cond." },
  { id: "subjuntivo", label: "Subjuntivo", short: "Subj." },
];

export const PERSONS = [
  { id: "yo", label: "yo", column: "yo" },
  { id: "tu", label: "tú", column: "tu" },
  { id: "vos", label: "vos", column: "tu" },
  { id: "el", label: "él", column: "el" },
  { id: "nos", label: "nos", column: "nos" },
  { id: "vosotros", label: "vosotros", column: "vosotros" },
  { id: "ellos", label: "ellos", column: "ellos" },
];

export const DEFAULT_TENSES = ["presente", "preterito"];
export const DEFAULT_PERSONS = ["yo", "tu", "el", "nos", "ellos"];
export const ROUND_SIZE = 10;

export const POOL = {
  REGULARS: 1,
  IRREGULARS: 2,
  STEM: 3,
};

export const VERB_TYPES = [
  { id: "regular", label: "regulars", pool: POOL.REGULARS },
  { id: "irregular", label: "high-freq irregulars", pool: POOL.IRREGULARS },
  { id: "stem", label: "stem-changers", pool: POOL.STEM },
  { id: "spelling", label: "spelling", pool: POOL.STEM },
];

export function isSingleTypePool(settings) {
  return settings.pool === POOL.REGULARS;
}

export function typesInPool(pool) {
  return VERB_TYPES.filter((type) => type.pool <= pool).map((type) => type.id);
}

export const DEFAULT_SETTINGS = {
  pool: POOL.REGULARS,
  tenses: [...DEFAULT_TENSES],
  vos: false,
  vosotros: false,
  timer: false,
  timerSec: 12,
  mc: false,
};

export const MASTERY_WINDOW = 7;
export const MASTERY_NEED = 5;
export const MASTERY_MIN = 5;

export const STORAGE_KEY = "verbos.v1";
