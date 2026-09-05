import { defaultSettings } from "./content.js";

const CORE = ["yo", "tu", "el", "nos", "ellos"];

function trial(spec) {
  return {
    optional: false,
    extraColumn: false,
    pickedVerbs: [],
    address: "tu",
    persons: CORE,
    endings: [],
    types: ["regular"],
    ...spec,
  };
}

export const journeyIslands = [
  { id: "a", label: "Presente", trials: ["1", "2", "3", "4", "5"] },
  { id: "b", label: "Pretérito", trials: ["6", "7", "8", "9"] },
  { id: "c", label: "Imperfecto", trials: ["10", "11", "review"] },
  { id: "d", label: "Futuro / Condicional", trials: ["12", "13"] },
  { id: "e", label: "Subjuntivo", trials: ["14", "15", "16"] },
  { id: "f", label: "Mandatos", trials: ["17", "18", "19"] },
  { id: "g", label: "Compounds", trials: ["20", "21", "22", "23", "24", "25", "26"] },
];

export function expandPersons(base, address = "tu", extraColumn = false) {
  const people = [];
  for (const person of base || CORE) {
    if (person === "tu") {
      if (address === "vos") people.push("vos");
      else if (address === "both") {
        people.push("tu");
        people.push("vos");
      } else people.push("tu");
      continue;
    }
    people.push(person);
  }
  if (extraColumn && !people.includes("vosotros")) {
    const ellos = people.indexOf("ellos");
    if (ellos >= 0) people.splice(ellos, 0, "vosotros");
    else people.push("vosotros");
  }
  return people;
}

export const journeyTrials = [
  trial({
    id: "1",
    order: 1,
    label: "Regulars -ar",
    requires: [],
    tenses: ["presente"],
    types: ["regular"],
    endings: ["ar"],
  }),
  trial({
    id: "2",
    order: 2,
    label: "Regulars -er/-ir",
    requires: ["1"],
    tenses: ["presente"],
    types: ["regular"],
    endings: ["er_ir"],
  }),
  trial({
    id: "3",
    order: 3,
    label: "ser / estar / ir",
    requires: ["2"],
    tenses: ["presente"],
    types: ["irregular"],
    pickedVerbs: ["ser", "estar", "ir"],
  }),
  trial({
    id: "4",
    order: 4,
    label: "tener, hacer",
    requires: ["3"],
    tenses: ["presente"],
    types: ["irregular"],
    pickedVerbs: ["tener", "hacer"],
  }),
  trial({
    id: "5",
    order: 5,
    label: "Stem-changers",
    requires: ["4"],
    tenses: ["presente"],
    types: ["stem"],
  }),
  trial({
    id: "6",
    order: 6,
    label: "Regulars -ar",
    requires: ["5"],
    tenses: ["preterito"],
    types: ["regular"],
    endings: ["ar"],
  }),
  trial({
    id: "7",
    order: 7,
    label: "Regulars -er/-ir",
    requires: ["6"],
    tenses: ["preterito"],
    types: ["regular"],
    endings: ["er_ir"],
  }),
  trial({
    id: "8",
    order: 8,
    label: "Spelling-change",
    requires: ["6", "7"],
    tenses: ["preterito"],
    types: ["spelling"],
  }),
  trial({
    id: "9",
    order: 9,
    label: "ser/ir, tener, estar, hacer, poder",
    requires: ["6", "7"],
    tenses: ["preterito"],
    types: ["irregular"],
    pickedVerbs: ["ser", "ir", "tener", "estar", "hacer", "poder"],
  }),
  trial({
    id: "10",
    order: 10,
    label: "Regulars + ser/ir/ver",
    requires: ["8", "9"],
    tenses: ["imperfecto"],
    types: ["regular", "irregular"],
    pickedVerbs: ["hablar", "comer", "vivir", "ser", "ir", "ver"],
  }),
  trial({
    id: "11",
    order: 11,
    label: "Pretérito vs imperfecto",
    requires: ["9", "10"],
    tenses: ["preterito", "imperfecto"],
    types: ["regular", "irregular"],
    pickedVerbs: ["hablar", "comer", "ser", "ir"],
  }),
  trial({
    id: "review",
    order: 11.1,
    label: "Review",
    optional: true,
    requires: ["9", "10"],
    tenses: ["preterito", "imperfecto"],
    types: ["regular"],
    endings: ["ar", "er_ir"],
  }),
  trial({
    id: "12",
    order: 12,
    label: "Futuro",
    requires: ["11"],
    tenses: ["futuro"],
    types: ["regular"],
  }),
  trial({
    id: "13",
    order: 13,
    label: "Condicional",
    requires: ["12"],
    tenses: ["condicional"],
    types: ["regular"],
  }),
  trial({
    id: "14",
    order: 14,
    label: "Presente regulars",
    requires: ["1", "2", "13"],
    tenses: ["subjuntivo"],
    types: ["regular"],
  }),
  trial({
    id: "15",
    order: 15,
    label: "Presente irregulars",
    requires: ["14"],
    tenses: ["subjuntivo"],
    types: ["irregular"],
    pickedVerbs: ["ser", "estar", "ir", "haber", "saber", "dar"],
  }),
  trial({
    id: "16",
    order: 16,
    label: "Imperfecto -ra",
    requires: ["15"],
    tenses: ["subjuntivo_imp"],
    types: ["regular"],
  }),
  trial({
    id: "17",
    order: 17,
    label: "Affirmative tú",
    requires: ["5"],
    tenses: ["mandato_af"],
    types: ["regular"],
    persons: ["tu"],
  }),
  trial({
    id: "18",
    order: 18,
    label: "Negative tú",
    requires: ["14"],
    tenses: ["mandato_neg"],
    types: ["regular"],
    persons: ["tu"],
  }),
  trial({
    id: "19",
    order: 19,
    label: "usted / ustedes",
    requires: ["17"],
    tenses: ["mandato_af", "mandato_neg"],
    types: ["regular"],
    persons: ["el", "ellos"],
  }),
  trial({
    id: "20",
    order: 20,
    label: "Perfecto regulars",
    requires: ["13"],
    tenses: ["perfecto"],
    types: ["regular"],
  }),
  trial({
    id: "21",
    order: 21,
    label: "Perfecto irregular participles",
    requires: ["20"],
    tenses: ["perfecto"],
    types: ["irregular", "regular", "stem"],
    pickedVerbs: ["hacer", "decir", "escribir", "poner", "ver", "volver"],
  }),
  trial({
    id: "22",
    order: 22,
    label: "Pluscuamperfecto",
    requires: ["20"],
    tenses: ["pluscuamperfecto"],
    types: ["regular"],
  }),
  trial({
    id: "23",
    order: 23,
    label: "Subjuntivo perfecto",
    requires: ["14", "20"],
    tenses: ["subjuntivo_perf"],
    types: ["regular"],
  }),
  trial({
    id: "24",
    order: 24,
    label: "Subjuntivo pluscuamperfecto -ra",
    requires: ["16", "22"],
    tenses: ["subjuntivo_pluscuam"],
    types: ["regular"],
  }),
  trial({
    id: "25",
    order: 25,
    label: "Futuro perfecto",
    requires: ["20"],
    tenses: ["futuro_perf"],
    types: ["regular"],
  }),
  trial({
    id: "26",
    order: 26,
    label: "Condicional perfecto",
    requires: ["20"],
    tenses: ["condicional_perf"],
    types: ["regular"],
  }),
];

export function trialSettings(spec, pronouns = {}) {
  const address = pronouns.address || defaultSettings.address;
  const extraColumn = Boolean(pronouns.extraColumn);
  return {
    ...defaultSettings,
    types: [...spec.types],
    tenses: [...spec.tenses],
    pickedVerbs: [...(spec.pickedVerbs || [])],
    customList: "",
    address,
    extraColumn,
    endings: [...(spec.endings || [])],
    persons: expandPersons(spec.persons, address, extraColumn),
    mc: false,
    timer: false,
  };
}
