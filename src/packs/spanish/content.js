import { conjugate } from "./verbs.js";

export const accents = ["á", "é", "í", "ó", "ú", "ü", "ñ"];

export const leadingPronouns = [
  "nosotros",
  "nosotras",
  "vosotros",
  "vosotras",
  "ustedes",
  "usted",
  "ellos",
  "ellas",
  "ella",
  "tú",
  "vos",
  "él",
  "yo",
  "tu",
  "el",
  "nos",
];

export const moods = [
  { id: "indicative", label: "Indicative" },
  { id: "subjunctive", label: "Subjunctive" },
  { id: "commands", label: "Commands" },
];

export const targetGroups = [
  {
    id: "indicative",
    label: "Indicative",
    items: [
      { id: "presente", label: "Presente", boardLabel: "Presente", mood: "indicative", time: "presente" },
      { id: "preterito", label: "Pretérito", boardLabel: "Pretérito", mood: "indicative", time: "preterito" },
      { id: "imperfecto", label: "Imperfecto", boardLabel: "Imperfecto", mood: "indicative", time: "imperfecto" },
      { id: "futuro", label: "Futuro", boardLabel: "Futuro", mood: "indicative", time: "futuro" },
      { id: "condicional", label: "Condicional", boardLabel: "Condicional", mood: "indicative", time: "condicional" },
      { id: "perfecto", label: "Perfecto", boardLabel: "Perfecto", mood: "indicative", time: "perfecto" },
      { id: "pluscuamperfecto", label: "Pluscuamperfecto", boardLabel: "Pluscuamperfecto", mood: "indicative", time: "pluscuamperfecto" },
      { id: "futuro_perf", label: "Futuro perfecto", boardLabel: "Futuro perfecto", mood: "indicative", time: "futuro_perfecto" },
      { id: "condicional_perf", label: "Condicional perfecto", boardLabel: "Condicional perfecto", mood: "indicative", time: "condicional_perfecto" },
    ],
  },
  {
    id: "subjunctive",
    label: "Subjunctive",
    items: [
      { id: "subjuntivo", label: "Presente", boardLabel: "Presente de subjuntivo", mood: "subjunctive", time: "presente" },
      { id: "subjuntivo_imp", label: "Imperfecto", boardLabel: "Imperfecto de subjuntivo", mood: "subjunctive", time: "imperfecto" },
      { id: "subjuntivo_perf", label: "Perfecto", boardLabel: "Perfecto de subjuntivo", mood: "subjunctive", time: "perfecto" },
      { id: "subjuntivo_pluscuam", label: "Pluscuamperfecto", boardLabel: "Pluscuamperfecto de subjuntivo", mood: "subjunctive", time: "pluscuamperfecto" },
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

export const persons = [
  { id: "yo", label: "yo", lines: ["yo"], skipMoods: ["commands"] },
  { id: "tu", label: "tú", lines: ["tú"], address: true },
  { id: "vos", label: "vos", lines: ["vos"], address: true },
  { id: "el", label: "él / ella / usted", lines: ["él / ella", "usted"] },
  { id: "nos", label: "nosotros", lines: ["nosotros"] },
  { id: "vosotros", label: "vosotros", lines: ["vosotros"], optionalColumn: true },
  { id: "ellos", label: "ellos / ellas / ustedes", lines: ["ellos / ellas", "ustedes"] },
];

export const verbBuckets = [
  { id: "regular", label: "Regulars", examples: "hablar" },
  { id: "irregular", label: "High-frequency irregulars", examples: "ser, ir, tener" },
  { id: "stem", label: "Stem-changing", examples: "pensar, volver" },
  { id: "spelling", label: "Spelling-change", examples: "llegar, sacar" },
];

export const endingPatterns = [
  { id: "ar", label: "-ar" },
  { id: "er_ir", label: "-er / -ir" },
];

export const addressOptions = [
  { id: "tu", label: "tú" },
  { id: "vos", label: "vos" },
  { id: "both", label: "both" },
];

export const pastePlaceholder = "hablar, ser, pedir";

export const chrome = {
  personLegend: "Pronouns",
  extraColumn: "Extra column",
  endingFilter: "Ending",
};

export const missCopy = {
  mark: "Missing the accent",
  stem: "Not that stem",
};

export const stripPunct = /[¡!¿?.,;:']/g;

export const defaultSettings = {
  types: ["regular"],
  tenses: ["presente", "preterito"],
  address: "tu",
  extraColumn: false,
  pickedVerbs: [],
  customList: "",
  timer: false,
  timerSec: 12,
  mc: false,
};

export function normalizeSettings(raw = {}) {
  const { vosotros, vos, ...rest } = raw;
  return {
    ...rest,
    extraColumn: Boolean(raw.extraColumn || vosotros),
    address: raw.address || (vos ? "vos" : raw.address),
  };
}

function sameFolded(form, got) {
  return String(form || "")
    .trim()
    .toLowerCase()
    .normalize("NFC") === got;
}

export function explainMiss(expected, given, { want, got, item } = {}) {
  if (got?.endsWith("stes") && want?.endsWith("ste")) {
    return { kind: "extra_s", message: "Extra s" };
  }
  if (!item?.verb || !item?.tense || !item?.person) return null;

  for (const person of persons) {
    if (person.id === item.person) continue;
    try {
      const form = conjugate(item.verb, item.tense, person.id);
      if (form && sameFolded(form, got)) {
        return { kind: "person", message: `That's ${person.label}` };
      }
    } catch {
      /* skip impossible person */
    }
  }

  const tenses = targetGroups.flatMap((group) => group.items);
  const here = tenses.find((tense) => tense.id === item.tense);
  for (const tense of tenses) {
    if (tense.id === item.tense) continue;
    try {
      const form = conjugate(item.verb, tense.id, item.person);
      if (form && sameFolded(form, got)) {
        return {
          kind: "time",
          message: `${here?.label ?? "This time"}, not ${tense.label}`,
          other: tense.id,
        };
      }
    } catch {
      /* skip */
    }
  }
  return null;
}
