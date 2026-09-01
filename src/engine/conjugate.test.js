import { describe, expect, it } from "vitest";
import { conjugate, SPECIAL_VERBS, verbsInPool } from "./verbs.js";
import { POOL } from "./constants.js";

const ALL_TENSES = [
  "presente",
  "preterito",
  "imperfecto",
  "futuro",
  "condicional",
  "subjuntivo",
];
const ALL_PERSONS = ["yo", "tu", "vos", "el", "nos", "vosotros", "ellos"];

describe("regular conjugations", () => {
  it("conjugates hablar across the default board", () => {
    expect(conjugate("hablar", "presente", "yo")).toBe("hablo");
    expect(conjugate("hablar", "presente", "tu")).toBe("hablas");
    expect(conjugate("hablar", "presente", "vos")).toBe("hablás");
    expect(conjugate("hablar", "presente", "el")).toBe("habla");
    expect(conjugate("hablar", "presente", "nos")).toBe("hablamos");
    expect(conjugate("hablar", "presente", "ellos")).toBe("hablan");
    expect(conjugate("hablar", "preterito", "yo")).toBe("hablé");
    expect(conjugate("hablar", "preterito", "tu")).toBe("hablaste");
    expect(conjugate("hablar", "preterito", "el")).toBe("habló");
    expect(conjugate("hablar", "preterito", "nos")).toBe("hablamos");
    expect(conjugate("hablar", "preterito", "ellos")).toBe("hablaron");
  });

  it("conjugates comer and vivir, including vos and vosotros", () => {
    expect(conjugate("comer", "presente", "vos")).toBe("comés");
    expect(conjugate("comer", "presente", "vosotros")).toBe("coméis");
    expect(conjugate("comer", "preterito", "yo")).toBe("comí");
    expect(conjugate("comer", "subjuntivo", "vos")).toBe("comás");
    expect(conjugate("vivir", "presente", "vos")).toBe("vivís");
    expect(conjugate("vivir", "presente", "vosotros")).toBe("vivís");
    expect(conjugate("vivir", "preterito", "el")).toBe("vivió");
    expect(conjugate("vivir", "subjuntivo", "vos")).toBe("vivás");
    expect(conjugate("vivir", "imperfecto", "nos")).toBe("vivíamos");
    expect(conjugate("hablar", "futuro", "yo")).toBe("hablaré");
    expect(conjugate("comer", "condicional", "el")).toBe("comería");
    expect(conjugate("hablar", "subjuntivo_imp", "yo")).toBe("hablara");
    expect(conjugate("hablar", "subjuntivo_imp", "nos")).toBe("habláramos");
    expect(conjugate("hablar", "mandato_af", "tu")).toBe("habla");
    expect(conjugate("hablar", "mandato_af", "vos")).toBe("hablá");
    expect(conjugate("hablar", "mandato_neg", "tu")).toBe("no hables");
    expect(conjugate("hablar", "mandato_neg", "vos")).toBe("no hablés");
  });
});

describe("irregulars and stem-changers", () => {
  it("covers high-frequency irregulars", () => {
    expect(conjugate("ser", "presente", "yo")).toBe("soy");
    expect(conjugate("ser", "presente", "vos")).toBe("sos");
    expect(conjugate("ir", "preterito", "el")).toBe("fue");
    expect(conjugate("tener", "presente", "vos")).toBe("tenés");
    expect(conjugate("hacer", "preterito", "el")).toBe("hizo");
    expect(conjugate("decir", "preterito", "ellos")).toBe("dijeron");
    expect(conjugate("dar", "subjuntivo", "yo")).toBe("dé");
    expect(conjugate("saber", "presente", "yo")).toBe("sé");
    expect(conjugate("oír", "presente", "yo")).toBe("oigo");
    expect(conjugate("traer", "preterito", "ellos")).toBe("trajeron");
    expect(conjugate("ser", "subjuntivo_imp", "yo")).toBe("fuera");
    expect(conjugate("decir", "subjuntivo_imp", "el")).toBe("dijera");
    expect(conjugate("ser", "mandato_af", "tu")).toBe("sé");
    expect(conjugate("hacer", "mandato_af", "tu")).toBe("haz");
    expect(conjugate("ir", "mandato_af", "vos")).toBe("andá");
  });

  it("covers stem changes and spelling changes", () => {
    expect(conjugate("pensar", "presente", "yo")).toBe("pienso");
    expect(conjugate("pensar", "presente", "vos")).toBe("pensás");
    expect(conjugate("dormir", "preterito", "el")).toBe("durmió");
    expect(conjugate("pedir", "presente", "yo")).toBe("pido");
    expect(conjugate("seguir", "presente", "yo")).toBe("sigo");
    expect(conjugate("buscar", "preterito", "yo")).toBe("busqué");
    expect(conjugate("llegar", "preterito", "yo")).toBe("llegué");
    expect(conjugate("empezar", "preterito", "yo")).toBe("empecé");
    expect(conjugate("conocer", "presente", "yo")).toBe("conozco");
    expect(conjugate("creer", "preterito", "el")).toBe("creyó");
    expect(conjugate("construir", "presente", "yo")).toBe("construyo");
  });

  it("has a complete table for every special verb", () => {
    for (const verb of SPECIAL_VERBS) {
      for (const tense of ALL_TENSES) {
        for (const person of ALL_PERSONS) {
          const form = conjugate(verb.inf, tense, person);
          expect(form, `${verb.inf} ${tense} ${person}`).toMatch(/\S/);
        }
      }
    }
  });
});

describe("verb pools", () => {
  it("steps regulars → irregulars → stem-changers", () => {
    const regulars = verbsInPool(POOL.REGULARS);
    const irreg = verbsInPool(POOL.IRREGULARS);
    const stem = verbsInPool(POOL.STEM);
    expect(regulars.every((verb) => verb.pool === POOL.REGULARS)).toBe(true);
    expect(irreg.some((verb) => verb.inf === "ser")).toBe(true);
    expect(irreg.every((verb) => verb.pool <= POOL.IRREGULARS)).toBe(true);
    expect(stem.some((verb) => verb.inf === "pensar" && verb.type === "stem")).toBe(true);
    expect(stem.some((verb) => verb.inf === "buscar" && verb.type === "spelling")).toBe(true);
    expect(stem.length).toBeGreaterThan(irreg.length);
    expect(irreg.length).toBeGreaterThan(regulars.length);
  });
});
