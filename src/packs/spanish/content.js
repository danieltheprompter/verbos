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

export const defaultSettings = {
  types: ["regular"],
  tenses: ["presente", "preterito"],
  address: "tu",
  vosotros: false,
  pickedVerbs: [],
  customList: "",
  timer: false,
  timerSec: 12,
  mc: false,
};

export function explainMiss(expected, given, { want, got }) {
  if (got.endsWith("stes") && want.endsWith("ste")) {
    return { kind: "extra_s", message: "Extra s" };
  }
  return null;
}
