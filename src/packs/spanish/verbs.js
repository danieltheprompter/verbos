import { POOL } from "../../engine/config.js";

const PERSONS = ["yo", "tu", "vos", "el", "nos", "vosotros", "ellos"];

function table(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length !== 7) {
    throw new Error(`Expected 7 forms, got ${parts.length}: ${line}`);
  }
  return Object.fromEntries(PERSONS.map((person, i) => [person, parts[i]]));
}

function pack(rows) {
  return Object.fromEntries(
    Object.entries(rows).map(([tense, line]) => [tense, table(line)]),
  );
}

export const REGULAR_VERBS = [
  "hablar",
  "cantar",
  "bailar",
  "caminar",
  "estudiar",
  "trabajar",
  "comprar",
  "escuchar",
  "viajar",
  "nadar",
  "pintar",
  "ayudar",
  "esperar",
  "preguntar",
  "mirar",
  "llamar",
  "tomar",
  "necesitar",
  "usar",
  "entrar",
  "comer",
  "beber",
  "correr",
  "aprender",
  "vender",
  "comprender",
  "temer",
  "deber",
  "esconder",
  "romper",
  "vivir",
  "escribir",
  "abrir",
  "subir",
  "decidir",
  "recibir",
  "partir",
  "permitir",
  "existir",
  "cumplir",
].map((inf) => ({
  inf,
  group: inf.slice(-2),
  pool: POOL.REGULARS,
  type: "regular",
}));

const SPELLING_INFS = new Set(["buscar", "llegar", "sacar", "conocer", "construir", "creer"]);

export function endingPattern(infinitive) {
  const text = String(infinitive || "").toLowerCase();
  return text.endsWith("ar") ? "ar" : "er_ir";
}

export function typeFromPool(infinitive, pool) {
  if (pool === POOL.REGULARS) return "regular";
  if (pool === POOL.IRREGULARS) return "irregular";
  if (SPELLING_INFS.has(infinitive)) return "spelling";
  return "stem";
}

const FUTURO = {
  yo: "é",
  tu: "ás",
  vos: "ás",
  el: "á",
  nos: "emos",
  vosotros: "éis",
  ellos: "án",
};

const CONDICIONAL = {
  yo: "ía",
  tu: "ías",
  vos: "ías",
  el: "ía",
  nos: "íamos",
  vosotros: "íais",
  ellos: "ían",
};

const ENDINGS = {
  presente: {
    ar: { yo: "o", tu: "as", vos: "ás", el: "a", nos: "amos", vosotros: "áis", ellos: "an" },
    er: { yo: "o", tu: "es", vos: "és", el: "e", nos: "emos", vosotros: "éis", ellos: "en" },
    ir: { yo: "o", tu: "es", vos: "ís", el: "e", nos: "imos", vosotros: "ís", ellos: "en" },
  },
  preterito: {
    ar: { yo: "é", tu: "aste", vos: "aste", el: "ó", nos: "amos", vosotros: "asteis", ellos: "aron" },
    er: { yo: "í", tu: "iste", vos: "iste", el: "ió", nos: "imos", vosotros: "isteis", ellos: "ieron" },
    ir: { yo: "í", tu: "iste", vos: "iste", el: "ió", nos: "imos", vosotros: "isteis", ellos: "ieron" },
  },
  imperfecto: {
    ar: { yo: "aba", tu: "abas", vos: "abas", el: "aba", nos: "ábamos", vosotros: "abais", ellos: "aban" },
    er: { yo: "ía", tu: "ías", vos: "ías", el: "ía", nos: "íamos", vosotros: "íais", ellos: "ían" },
    ir: { yo: "ía", tu: "ías", vos: "ías", el: "ía", nos: "íamos", vosotros: "íais", ellos: "ían" },
  },
  subjuntivo: {
    ar: { yo: "e", tu: "es", vos: "és", el: "e", nos: "emos", vosotros: "éis", ellos: "en" },
    er: { yo: "a", tu: "as", vos: "ás", el: "a", nos: "amos", vosotros: "áis", ellos: "an" },
    ir: { yo: "a", tu: "as", vos: "ás", el: "a", nos: "amos", vosotros: "áis", ellos: "an" },
  },
};

export function regularForm(infinitive, tense, person) {
  const group = infinitive.slice(-2);
  const stem = infinitive.slice(0, -2);
  if (tense === "futuro") return infinitive + FUTURO[person];
  if (tense === "condicional") return infinitive + CONDICIONAL[person];
  if (tense === "subjuntivo_imp") return imperfectSubjunctive(infinitive, person);
  if (tense === "mandato_af" || tense === "mandato_neg") {
    return commandForm(infinitive, tense === "mandato_af" ? "af" : "neg", person);
  }
  return stem + ENDINGS[tense][group][person];
}

function pretEllos(infinitive) {
  const special = SPECIAL_BY_INF?.[infinitive];
  if (special?.forms?.preterito?.ellos) return special.forms.preterito.ellos;
  const group = infinitive.slice(-2);
  const stem = infinitive.slice(0, -2);
  return stem + ENDINGS.preterito[group].ellos;
}

function accentLastVowel(text) {
  return text.replace(/[aeiou](?!.*[aeiou])/i, (vowel) => {
    return { a: "á", e: "é", i: "í", o: "ó", u: "ú" }[vowel.toLowerCase()] || vowel;
  });
}

export function imperfectSubjunctive(infinitive, person) {
  const stem = pretEllos(infinitive).slice(0, -3);
  const forms = {
    yo: `${stem}ra`,
    tu: `${stem}ras`,
    vos: `${stem}ras`,
    el: `${stem}ra`,
    nos: `${accentLastVowel(stem)}ramos`,
    vosotros: `${stem}rais`,
    ellos: `${stem}ran`,
  };
  return forms[person];
}

const AF_TU = {
  ser: "sé",
  ir: "ve",
  tener: "ten",
  venir: "ven",
  poner: "pon",
  salir: "sal",
  hacer: "haz",
  decir: "di",
};

const AF_VOS = {
  ser: "sé",
  ir: "andá",
  tener: "tené",
  venir: "vení",
  poner: "poné",
  salir: "salí",
  hacer: "hacé",
  decir: "decí",
};

function lookupForm(infinitive, tense, person) {
  const special = SPECIAL_BY_INF?.[infinitive];
  if (special?.forms?.[tense]?.[person]) return special.forms[tense][person];
  return regularForm(infinitive, tense, person);
}

export function commandForm(infinitive, polarity, person) {
  if (person === "yo") return null;
  if (polarity === "neg") return `no ${lookupForm(infinitive, "subjuntivo", person)}`;
  if (person === "tu") {
    return AF_TU[infinitive] || lookupForm(infinitive, "presente", "el");
  }
  if (person === "vos") {
    if (AF_VOS[infinitive]) return AF_VOS[infinitive];
    const group = infinitive.slice(-2);
    return infinitive.slice(0, -2) + { ar: "á", er: "é", ir: "í" }[group];
  }
  if (person === "vosotros") {
    if (infinitive === "ir") return "id";
    if (infinitive === "ser") return "sed";
    return `${infinitive.slice(0, -1)}d`;
  }
  return lookupForm(infinitive, "subjuntivo", person);
}

export const SPECIAL_VERBS = [
  {
    inf: "ser",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "soy eres sos es somos sois son",
      preterito: "fui fuiste fuiste fue fuimos fuisteis fueron",
      imperfecto: "era eras eras era éramos erais eran",
      futuro: "seré serás serás será seremos seréis serán",
      condicional: "sería serías serías sería seríamos seríais serían",
      subjuntivo: "sea seas seás sea seamos seáis sean",
    }),
  },
  {
    inf: "estar",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "estoy estás estás está estamos estáis están",
      preterito: "estuve estuviste estuviste estuvo estuvimos estuvisteis estuvieron",
      imperfecto: "estaba estabas estabas estaba estábamos estabais estaban",
      futuro: "estaré estarás estarás estará estaremos estaréis estarán",
      condicional: "estaría estarías estarías estaría estaríamos estaríais estarían",
      subjuntivo: "esté estés estés esté estemos estéis estén",
    }),
  },
  {
    inf: "ir",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "voy vas vas va vamos vais van",
      preterito: "fui fuiste fuiste fue fuimos fuisteis fueron",
      imperfecto: "iba ibas ibas iba íbamos ibais iban",
      futuro: "iré irás irás irá iremos iréis irán",
      condicional: "iría irías irías iría iríamos iríais irían",
      subjuntivo: "vaya vayas vayás vaya vayamos vayáis vayan",
    }),
  },
  {
    inf: "tener",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "tengo tienes tenés tiene tenemos tenéis tienen",
      preterito: "tuve tuviste tuviste tuvo tuvimos tuvisteis tuvieron",
      imperfecto: "tenía tenías tenías tenía teníamos teníais tenían",
      futuro: "tendré tendrás tendrás tendrá tendremos tendréis tendrán",
      condicional: "tendría tendrías tendrías tendría tendríamos tendríais tendrían",
      subjuntivo: "tenga tengas tengás tenga tengamos tengáis tengan",
    }),
  },
  {
    inf: "hacer",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "hago haces hacés hace hacemos hacéis hacen",
      preterito: "hice hiciste hiciste hizo hicimos hicisteis hicieron",
      imperfecto: "hacía hacías hacías hacía hacíamos hacíais hacían",
      futuro: "haré harás harás hará haremos haréis harán",
      condicional: "haría harías harías haría haríamos haríais harían",
      subjuntivo: "haga hagas hagás haga hagamos hagáis hagan",
    }),
  },
  {
    inf: "poder",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "puedo puedes podés puede podemos podéis pueden",
      preterito: "pude pudiste pudiste pudo pudimos pudisteis pudieron",
      imperfecto: "podía podías podías podía podíamos podíais podían",
      futuro: "podré podrás podrás podrá podremos podréis podrán",
      condicional: "podría podrías podrías podría podríamos podríais podrían",
      subjuntivo: "pueda puedas podás pueda podamos podáis puedan",
    }),
  },
  {
    inf: "decir",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "digo dices decís dice decimos decís dicen",
      preterito: "dije dijiste dijiste dijo dijimos dijisteis dijeron",
      imperfecto: "decía decías decías decía decíamos decíais decían",
      futuro: "diré dirás dirás dirá diremos diréis dirán",
      condicional: "diría dirías dirías diría diríamos diríais dirían",
      subjuntivo: "diga digas digás diga digamos digáis digan",
    }),
  },
  {
    inf: "venir",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "vengo vienes venís viene venimos venís vienen",
      preterito: "vine viniste viniste vino vinimos vinisteis vinieron",
      imperfecto: "venía venías venías venía veníamos veníais venían",
      futuro: "vendré vendrás vendrás vendrá vendremos vendréis vendrán",
      condicional: "vendría vendrías vendrías vendría vendríamos vendríais vendrían",
      subjuntivo: "venga vengas vengás venga vengamos vengáis vengan",
    }),
  },
  {
    inf: "ver",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "veo ves ves ve vemos veis ven",
      preterito: "vi viste viste vio vimos visteis vieron",
      imperfecto: "veía veías veías veía veíamos veíais veían",
      futuro: "veré verás verás verá veremos veréis verán",
      condicional: "vería verías verías vería veríamos veríais verían",
      subjuntivo: "vea veas veás vea veamos veáis vean",
    }),
  },
  {
    inf: "dar",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "doy das das da damos dais dan",
      preterito: "di diste diste dio dimos disteis dieron",
      imperfecto: "daba dabas dabas daba dábamos dabais daban",
      futuro: "daré darás darás dará daremos daréis darán",
      condicional: "daría darías darías daría daríamos daríais darían",
      subjuntivo: "dé des dés dé demos deis den",
    }),
  },
  {
    inf: "saber",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "sé sabes sabés sabe sabemos sabéis saben",
      preterito: "supe supiste supiste supo supimos supisteis supieron",
      imperfecto: "sabía sabías sabías sabía sabíamos sabíais sabían",
      futuro: "sabré sabrás sabrás sabrá sabremos sabréis sabrán",
      condicional: "sabría sabrías sabrías sabría sabríamos sabríais sabrían",
      subjuntivo: "sepa sepas sepás sepa sepamos sepáis sepan",
    }),
  },
  {
    inf: "querer",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "quiero quieres querés quiere queremos queréis quieren",
      preterito: "quise quisiste quisiste quiso quisimos quisisteis quisieron",
      imperfecto: "quería querías querías quería queríamos queríais querían",
      futuro: "querré querrás querrás querrá querremos querréis querrán",
      condicional: "querría querrías querrías querría querríamos querríais querrían",
      subjuntivo: "quiera quieras querás quiera queramos queráis quieran",
    }),
  },
  {
    inf: "poner",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "pongo pones ponés pone ponemos ponéis ponen",
      preterito: "puse pusiste pusiste puso pusimos pusisteis pusieron",
      imperfecto: "ponía ponías ponías ponía poníamos poníais ponían",
      futuro: "pondré pondrás pondrás pondrá pondremos pondréis pondrán",
      condicional: "pondría pondrías pondrías pondría pondríamos pondríais pondrían",
      subjuntivo: "ponga pongas pongás ponga pongamos pongáis pongan",
    }),
  },
  {
    inf: "salir",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "salgo sales salís sale salimos salís salen",
      preterito: "salí saliste saliste salió salimos salisteis salieron",
      imperfecto: "salía salías salías salía salíamos salíais salían",
      futuro: "saldré saldrás saldrás saldrá saldremos saldréis saldrán",
      condicional: "saldría saldrías saldrías saldría saldríamos saldríais saldrían",
      subjuntivo: "salga salgas salgás salga salgamos salgáis salgan",
    }),
  },
  {
    inf: "oír",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "oigo oyes oís oye oímos oís oyen",
      preterito: "oí oíste oíste oyó oímos oísteis oyeron",
      imperfecto: "oía oías oías oía oíamos oíais oían",
      futuro: "oiré oirás oirás oirá oiremos oiréis oirán",
      condicional: "oiría oirías oirías oiría oiríamos oiríais oirían",
      subjuntivo: "oiga oigas oigás oiga oigamos oigáis oigan",
    }),
  },
  {
    inf: "traer",
    pool: POOL.IRREGULARS,
    forms: pack({
      presente: "traigo traes traés trae traemos traéis traen",
      preterito: "traje trajiste trajiste trajo trajimos trajisteis trajeron",
      imperfecto: "traía traías traías traía traíamos traíais traían",
      futuro: "traeré traerás traerás traerá traeremos traeréis traerán",
      condicional: "traería traerías traerías traería traeríamos traeríais traerían",
      subjuntivo: "traiga traigas traigás traiga traigamos traigáis traigan",
    }),
  },
  {
    inf: "pensar",
    pool: POOL.STEM,
    forms: pack({
      presente: "pienso piensas pensás piensa pensamos pensáis piensan",
      preterito: "pensé pensaste pensaste pensó pensamos pensasteis pensaron",
      imperfecto: "pensaba pensabas pensabas pensaba pensábamos pensabais pensaban",
      futuro: "pensaré pensarás pensarás pensará pensaremos pensaréis pensarán",
      condicional: "pensaría pensarías pensarías pensaría pensaríamos pensaríais pensarían",
      subjuntivo: "piense pienses pensés piense pensemos penséis piensen",
    }),
  },
  {
    inf: "cerrar",
    pool: POOL.STEM,
    forms: pack({
      presente: "cierro cierras cerrás cierra cerramos cerráis cierran",
      preterito: "cerré cerraste cerraste cerró cerramos cerrasteis cerraron",
      imperfecto: "cerraba cerrabas cerrabas cerraba cerrábamos cerrabais cerraban",
      futuro: "cerraré cerrarás cerrarás cerrará cerraremos cerraréis cerrarán",
      condicional: "cerraría cerrarías cerrarías cerraría cerraríamos cerraríais cerrarían",
      subjuntivo: "cierre cierres cerrés cierre cerremos cerréis cierren",
    }),
  },
  {
    inf: "entender",
    pool: POOL.STEM,
    forms: pack({
      presente: "entiendo entiendes entendés entiende entendemos entendéis entienden",
      preterito: "entendí entendiste entendiste entendió entendimos entendisteis entendieron",
      imperfecto: "entendía entendías entendías entendía entendíamos entendíais entendían",
      futuro: "entenderé entenderás entenderás entenderá entenderemos entenderéis entenderán",
      condicional: "entendería entenderías entenderías entendería entenderíamos entenderíais entenderían",
      subjuntivo: "entienda entiendas entendás entienda entendamos entendáis entiendan",
    }),
  },
  {
    inf: "sentir",
    pool: POOL.STEM,
    forms: pack({
      presente: "siento sientes sentís siente sentimos sentís sienten",
      preterito: "sentí sentiste sentiste sintió sentimos sentisteis sintieron",
      imperfecto: "sentía sentías sentías sentía sentíamos sentíais sentían",
      futuro: "sentiré sentirás sentirás sentirá sentiremos sentiréis sentirán",
      condicional: "sentiría sentirías sentirías sentiría sentiríamos sentiríais sentirían",
      subjuntivo: "sienta sientas sentás sienta sintamos sintáis sientan",
    }),
  },
  {
    inf: "preferir",
    pool: POOL.STEM,
    forms: pack({
      presente: "prefiero prefieres preferís prefiere preferimos preferís prefieren",
      preterito: "preferí preferiste preferiste prefirió preferimos preferisteis prefirieron",
      imperfecto: "prefería preferías preferías prefería preferíamos preferíais preferían",
      futuro: "preferiré preferirás preferirás preferirá preferiremos preferiréis preferirán",
      condicional: "preferiría preferirías preferirías preferiría preferiríamos preferiríais preferirían",
      subjuntivo: "prefiera prefieras preferás prefiera prefiramos prefiráis prefieran",
    }),
  },
  {
    inf: "empezar",
    pool: POOL.STEM,
    forms: pack({
      presente: "empiezo empiezas empezás empieza empezamos empezáis empiezan",
      preterito: "empecé empezaste empezaste empezó empezamos empezasteis empezaron",
      imperfecto: "empezaba empezabas empezabas empezaba empezábamos empezabais empezaban",
      futuro: "empezaré empezarás empezarás empezará empezaremos empezaréis empezarán",
      condicional: "empezaría empezarías empezarías empezaría empezaríamos empezaríais empezarían",
      subjuntivo: "empiece empieces empecés empiece empecemos empecéis empiecen",
    }),
  },
  {
    inf: "dormir",
    pool: POOL.STEM,
    forms: pack({
      presente: "duermo duermes dormís duerme dormimos dormís duermen",
      preterito: "dormí dormiste dormiste durmió dormimos dormisteis durmieron",
      imperfecto: "dormía dormías dormías dormía dormíamos dormíais dormían",
      futuro: "dormiré dormirás dormirás dormirá dormiremos dormiréis dormirán",
      condicional: "dormiría dormirías dormirías dormiría dormiríamos dormiríais dormirían",
      subjuntivo: "duerma duermas dormás duerma durmamos durmáis duerman",
    }),
  },
  {
    inf: "volver",
    pool: POOL.STEM,
    forms: pack({
      presente: "vuelvo vuelves volvés vuelve volvemos volvéis vuelven",
      preterito: "volví volviste volviste volvió volvimos volvisteis volvieron",
      imperfecto: "volvía volvías volvías volvía volvíamos volvíais volvían",
      futuro: "volveré volverás volverás volverá volveremos volveréis volverán",
      condicional: "volvería volverías volverías volvería volveríamos volveríais volverían",
      subjuntivo: "vuelva vuelvas volvás vuelva volvamos volváis vuelvan",
    }),
  },
  {
    inf: "contar",
    pool: POOL.STEM,
    forms: pack({
      presente: "cuento cuentas contás cuenta contamos contáis cuentan",
      preterito: "conté contaste contaste contó contamos contasteis contaron",
      imperfecto: "contaba contabas contabas contaba contábamos contabais contaban",
      futuro: "contaré contarás contarás contará contaremos contaréis contarán",
      condicional: "contaría contarías contarías contaría contaríamos contaríais contarían",
      subjuntivo: "cuente cuentes contés cuente contemos contéis cuenten",
    }),
  },
  {
    inf: "encontrar",
    pool: POOL.STEM,
    forms: pack({
      presente: "encuentro encuentras encontrás encuentra encontramos encontráis encuentran",
      preterito: "encontré encontraste encontraste encontró encontramos encontrasteis encontraron",
      imperfecto: "encontraba encontrabas encontrabas encontraba encontrábamos encontrabais encontraban",
      futuro: "encontraré encontrarás encontrarás encontrará encontraremos encontraréis encontrarán",
      condicional: "encontraría encontrarías encontrarías encontraría encontraríamos encontraríais encontrarían",
      subjuntivo: "encuentre encuentres encontrés encuentre encontremos encontréis encuentren",
    }),
  },
  {
    inf: "pedir",
    pool: POOL.STEM,
    forms: pack({
      presente: "pido pides pedís pide pedimos pedís piden",
      preterito: "pedí pediste pediste pidió pedimos pedisteis pidieron",
      imperfecto: "pedía pedías pedías pedía pedíamos pedíais pedían",
      futuro: "pediré pedirás pedirás pedirá pediremos pediréis pedirán",
      condicional: "pediría pedirías pedirías pediría pediríamos pediríais pedirían",
      subjuntivo: "pida pidas pidás pida pidamos pidáis pidan",
    }),
  },
  {
    inf: "servir",
    pool: POOL.STEM,
    forms: pack({
      presente: "sirvo sirves servís sirve servimos servís sirven",
      preterito: "serví serviste serviste sirvió servimos servisteis sirvieron",
      imperfecto: "servía servías servías servía servíamos servíais servían",
      futuro: "serviré servirás servirás servirá serviremos serviréis servirán",
      condicional: "serviría servirías servirías serviría serviríamos serviríais servirían",
      subjuntivo: "sirva sirvas sirvás sirva sirvamos sirváis sirvan",
    }),
  },
  {
    inf: "repetir",
    pool: POOL.STEM,
    forms: pack({
      presente: "repito repites repetís repite repetimos repetís repiten",
      preterito: "repetí repetiste repetiste repitió repetimos repetisteis repitieron",
      imperfecto: "repetía repetías repetías repetía repetíamos repetíais repetían",
      futuro: "repetiré repetirás repetirás repetirá repetiremos repetiréis repetirán",
      condicional: "repetiría repetirías repetirías repetiría repetiríamos repetiríais repetirían",
      subjuntivo: "repita repitas repitás repita repitamos repitáis repitan",
    }),
  },
  {
    inf: "seguir",
    pool: POOL.STEM,
    forms: pack({
      presente: "sigo sigues seguís sigue seguimos seguís siguen",
      preterito: "seguí seguiste seguiste siguió seguimos seguisteis siguieron",
      imperfecto: "seguía seguías seguías seguía seguíamos seguíais seguían",
      futuro: "seguiré seguirás seguirás seguirá seguiremos seguiréis seguirán",
      condicional: "seguiría seguirías seguirías seguiría seguiríamos seguiríais seguirían",
      subjuntivo: "siga sigas sigás siga sigamos sigáis sigan",
    }),
  },
  {
    inf: "buscar",
    pool: POOL.STEM,
    forms: pack({
      presente: "busco buscas buscás busca buscamos buscáis buscan",
      preterito: "busqué buscaste buscaste buscó buscamos buscasteis buscaron",
      imperfecto: "buscaba buscabas buscabas buscaba buscábamos buscabais buscaban",
      futuro: "buscaré buscarás buscarás buscará buscaremos buscaréis buscarán",
      condicional: "buscaría buscarías buscarías buscaría buscaríamos buscaríais buscarían",
      subjuntivo: "busque busques busqués busque busquemos busquéis busquen",
    }),
  },
  {
    inf: "llegar",
    pool: POOL.STEM,
    forms: pack({
      presente: "llego llegas llegás llega llegamos llegáis llegan",
      preterito: "llegué llegaste llegaste llegó llegamos llegasteis llegaron",
      imperfecto: "llegaba llegabas llegabas llegaba llegábamos llegabais llegaban",
      futuro: "llegaré llegarás llegarás llegará llegaremos llegaréis llegarán",
      condicional: "llegaría llegarías llegarías llegaría llegaríamos llegaríais llegarían",
      subjuntivo: "llegue llegues llegués llegue lleguemos lleguéis lleguen",
    }),
  },
  {
    inf: "sacar",
    pool: POOL.STEM,
    forms: pack({
      presente: "saco sacas sacás saca sacamos sacáis sacan",
      preterito: "saqué sacaste sacaste sacó sacamos sacasteis sacaron",
      imperfecto: "sacaba sacabas sacabas sacaba sacábamos sacabais sacaban",
      futuro: "sacaré sacarás sacarás sacará sacaremos sacaréis sacarán",
      condicional: "sacaría sacarías sacarías sacaría sacaríamos sacaríais sacarían",
      subjuntivo: "saque saques saqués saque saquemos saquéis saquen",
    }),
  },
  {
    inf: "conocer",
    pool: POOL.STEM,
    forms: pack({
      presente: "conozco conoces conocés conoce conocemos conocéis conocen",
      preterito: "conocí conociste conociste conoció conocimos conocisteis conocieron",
      imperfecto: "conocía conocías conocías conocía conocíamos conocíais conocían",
      futuro: "conoceré conocerás conocerás conocerá conoceremos conoceréis conocerán",
      condicional: "conocería conocerías conocerías conocería conoceríamos conoceríais conocerían",
      subjuntivo: "conozca conozcas conozcás conozca conozcamos conozcáis conozcan",
    }),
  },
  {
    inf: "construir",
    pool: POOL.STEM,
    forms: pack({
      presente: "construyo construyes construís construye construimos construís construyen",
      preterito: "construí construiste construiste construyó construimos construisteis construyeron",
      imperfecto: "construía construías construías construía construíamos construíais construían",
      futuro: "construiré construirás construirás construirá construiremos construiréis construirán",
      condicional: "construiría construirías construirías construiría construiríamos construiríais construirían",
      subjuntivo: "construya construyas construyás construya construyamos construyáis construyan",
    }),
  },
  {
    inf: "creer",
    pool: POOL.STEM,
    forms: pack({
      presente: "creo crees creés cree creemos creéis creen",
      preterito: "creí creíste creíste creyó creímos creísteis creyeron",
      imperfecto: "creía creías creías creía creíamos creíais creían",
      futuro: "creeré creerás creerás creerá creeremos creeréis creerán",
      condicional: "creería creerías creerías creería creeríamos creeríais creerían",
      subjuntivo: "crea creas creás crea creamos creáis crean",
    }),
  },
];

const SPECIAL_BY_INF = Object.fromEntries(
  SPECIAL_VERBS.map((verb) => [
    verb.inf,
    { ...verb, type: typeFromPool(verb.inf, verb.pool) },
  ]),
);

export const ALL_VERBS = [
  ...REGULAR_VERBS,
  ...SPECIAL_VERBS.map((verb) => ({ ...verb, type: typeFromPool(verb.inf, verb.pool) })),
];

export function verbsInPool(level) {
  return ALL_VERBS.filter((verb) => verb.pool <= level);
}

export function getVerb(infinitive) {
  return SPECIAL_BY_INF[infinitive] || REGULAR_VERBS.find((verb) => verb.inf === infinitive);
}

export function asPlayableVerb(infinitive) {
  const known = getVerb(infinitive);
  if (known) return known;
  const group = infinitive.slice(-2);
  if (!["ar", "er", "ir"].includes(group)) return null;
  return { inf: infinitive, group, pool: POOL.REGULARS, type: "regular" };
}

export function parseCustomList(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(asPlayableVerb)
    .filter(Boolean);
}

export function uniqueVerbs(verbs) {
  const seen = new Set();
  return verbs.filter((verb) => {
    if (seen.has(verb.inf)) return false;
    seen.add(verb.inf);
    return true;
  });
}

export function pickedVerbsFrom(settings) {
  return uniqueVerbs(
    (settings.pickedVerbs || []).map(asPlayableVerb).filter(Boolean),
  );
}

export function verbsForSettings(settings) {
  const chosen = uniqueVerbs([
    ...pickedVerbsFrom(settings),
    ...parseCustomList(settings.customList),
  ]);
  if (chosen.length) return chosen;
  const types = settings.types?.length ? settings.types : ["regular"];
  return ALL_VERBS.filter((verb) => types.includes(verb.type));
}

export function activeTypes(settings) {
  return [...new Set(verbsForSettings(settings).map((verb) => verb.type))];
}

export function isSingleTypePool(settings) {
  return activeTypes(settings).length <= 1;
}

export function verbsInBucket(type) {
  return ALL_VERBS.filter((verb) => verb.type === type);
}

export function verbType(infinitive) {
  const verb = getVerb(infinitive);
  return verb?.type || "regular";
}

export function verbsOfType(level, type) {
  return verbsInPool(level).filter((verb) => verb.type === type);
}

export function conjugate(infinitive, tense, person) {
  if (tense === "subjuntivo_imp") return imperfectSubjunctive(infinitive, person);
  if (tense === "mandato_af") return commandForm(infinitive, "af", person);
  if (tense === "mandato_neg") return commandForm(infinitive, "neg", person);
  const special = SPECIAL_BY_INF[infinitive];
  if (special) {
    const form = special.forms[tense]?.[person];
    if (!form) throw new Error(`Missing form ${infinitive} ${tense} ${person}`);
    return form;
  }
  return regularForm(infinitive, tense, person);
}
