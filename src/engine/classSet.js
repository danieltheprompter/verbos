import { DEFAULT_SETTINGS } from "./constants.js";
import { pack, tenseById } from "./pack.js";

export const CLASS_SET_FIELDS = [
  "types",
  "tenses",
  "pickedVerbs",
  "customList",
  "address",
  "extraColumn",
];

const bucketIds = new Set(pack.verbBuckets.map((bucket) => bucket.id));
const addressIds = new Set((pack.addressOptions || []).map((option) => option.id));

export function classSetFromSettings(settings = DEFAULT_SETTINGS) {
  return {
    v: 1,
    types: Array.isArray(settings.types) ? [...settings.types] : [...DEFAULT_SETTINGS.types],
    tenses: Array.isArray(settings.tenses) ? [...settings.tenses] : [...DEFAULT_SETTINGS.tenses],
    pickedVerbs: Array.isArray(settings.pickedVerbs) ? [...settings.pickedVerbs] : [],
    customList: String(settings.customList || ""),
    address: settings.address || DEFAULT_SETTINGS.address,
    extraColumn: Boolean(settings.extraColumn),
  };
}

export function encodeClassSet(payload) {
  return JSON.stringify(classSetFromSettings(payload));
}

export function parseClassSet(text) {
  let raw;
  try {
    raw = JSON.parse(String(text || "").trim());
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const tenses = (Array.isArray(raw.tenses) ? raw.tenses : []).filter((id) => tenseById[id]);
  if (!tenses.length) return null;
  const types = (Array.isArray(raw.types) ? raw.types : []).filter((id) => bucketIds.has(id));
  const pickedVerbs = Array.isArray(raw.pickedVerbs)
    ? raw.pickedVerbs.filter((verb) => typeof verb === "string" && verb.trim())
    : [];
  const customList = typeof raw.customList === "string" ? raw.customList : "";
  if (!types.length && !pickedVerbs.length && !customList.trim()) return null;
  const address = addressIds.has(raw.address) ? raw.address : DEFAULT_SETTINGS.address;
  return {
    v: 1,
    types: types.length ? types : [...DEFAULT_SETTINGS.types],
    tenses,
    pickedVerbs,
    customList,
    address,
    extraColumn: Boolean(raw.extraColumn),
  };
}

export function applyClassSet(settings, payload) {
  if (!payload) return settings;
  return {
    ...settings,
    types: [...payload.types],
    tenses: [...payload.tenses],
    pickedVerbs: [...payload.pickedVerbs],
    customList: payload.customList,
    address: payload.address,
    extraColumn: Boolean(payload.extraColumn),
  };
}

export function settingsLookLikeClassSet(settings) {
  const payload = classSetFromSettings(settings);
  const baseline = classSetFromSettings(DEFAULT_SETTINGS);
  return encodeClassSet(payload) !== encodeClassSet(baseline);
}
