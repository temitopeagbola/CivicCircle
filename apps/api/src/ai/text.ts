import { SIGNAL_WORDS } from './keywords';

/**
 * Small, dependency-free text utilities behind the mock AI provider. They are also the
 * shared fallback embedding, so reports embedded by different models can still be compared.
 */

const STOPWORDS = new Set(
  (
    'a an and are as at be been but by for from has have i im is it its of on or our that the ' +
    'their there theres this to was we were with near outside next by up down just very really ' +
    'been being again also into onto over under please can could would should will now still ' +
    'some any all my me you your he she they them who what when where which while about'
  ).split(' '),
);

/** Map common variants to one token so "streetlight", "lamp post" and "light" line up. */
const CANONICAL: Record<string, string> = {
  streetlight: 'light',
  streetlamp: 'light',
  lamp: 'light',
  lamppost: 'light',
  bulb: 'light',
  litter: 'rubbish',
  trash: 'rubbish',
  garbage: 'rubbish',
  waste: 'rubbish',
  flytip: 'rubbish',
  dump: 'rubbish',
  junk: 'rubbish',
  crater: 'pothole',
  hole: 'pothole',
  flood: 'flood',
  puddle: 'flood',
  waterlog: 'flood',
  sidewalk: 'pavement',
  footpath: 'pavement',
  footway: 'pavement',
  curb: 'kerb',
  tag: 'graffiti',
  spraypaint: 'graffiti',
  st: 'street',
  rd: 'road',
};

export function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ch|sh|x|ss|z)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/fly[\s-]?tip\w*/g, 'flytip')
    .replace(/street[\s-]?light\w*/g, 'streetlight')
    .replace(/lamp[\s-]?post\w*/g, 'lamppost')
    .replace(/spray[\s-]?paint\w*/g, 'spraypaint')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => {
      const s = stem(w);
      return CANONICAL[s] ?? CANONICAL[w] ?? s;
    });
}

/** 32-bit FNV-1a. */
function fnv1a(input: string, seed = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const HASH_EMBEDDING_DIMS = 256;
export const HASH_EMBEDDING_MODEL = 'hashed-bow-v1';
/** Calibrated on paraphrase vs. same-street-different-issue pairs (see duplicates tests). */
export const HASH_SIMILARITY_THRESHOLD = 0.35;

/**
 * Feature-hashed bag of words + bigrams, L2-normalised. Deterministic and free; good enough
 * to spot "same issue, different words" when reports share the key nouns. Issue words
 * ("pothole", "light"…) weigh more than place words, since nearby reports share street names.
 */
export function hashEmbedding(text: string, dims = HASH_EMBEDDING_DIMS): number[] {
  const vector = new Array<number>(dims).fill(0);
  const tokens = tokenize(text);
  const features: [string, number][] = tokens.map((t) => [t, SIGNAL_WORDS.has(t) ? 2.5 : 1]);
  for (let i = 0; i < tokens.length - 1; i++) features.push([`${tokens[i]}_${tokens[i + 1]}`, 0.5]);
  for (const [feature, weight] of features) {
    const h = fnv1a(feature);
    const sign = fnv1a(feature, 0x9e3779b9) & 1 ? 1 : -1;
    vector[h % dims]! += sign * weight;
  }
  return normalize(vector);
}

export function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/** First sentence, de-filler'd, capitalised and cut to `max` characters on a word boundary. */
export function oneLineSummary(description: string, max = 90): string {
  const clean = description.replace(/\s+/g, ' ').trim();
  const first = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
  const stripped = first
    .replace(
      /^(hi|hello|hey)[,!. ]+|^(there is|there's|there are|i want to report|i'd like to report|please fix|just to report)\s+(an?\s+|the\s+)?/i,
      '',
    )
    .replace(/[.!?]+$/, '')
    .trim();
  const text = stripped.length >= 3 ? stripped : clean;
  const capitalised = text.charAt(0).toUpperCase() + text.slice(1);
  if (capitalised.length <= max) return capitalised;
  const cut = capitalised.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, '')}…`;
}
