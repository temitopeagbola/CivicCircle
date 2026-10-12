import type { Category } from '@civiccircle/shared';

/** Keyword weights per category, written against `tokenize()` output (stemmed + canonical). */
export const KEYWORDS: Record<Exclude<Category, 'other'>, Record<string, number>> = {
  roads: { pothole: 3, road: 1, tarmac: 2, sinkhole: 3, resurfac: 2, carriageway: 2, rut: 1 },
  lighting: { light: 3, dark: 1, flicker: 2, unlit: 2, lit: 1 },
  waste: { rubbish: 3, bin: 2, mattress: 2, fridge: 2, sofa: 2, bag: 1, overflow: 1, dumped: 2 },
  graffiti: { graffiti: 3, vandal: 2, vandalism: 3, smash: 1, scrawl: 2, offensive: 1 },
  water: { flood: 3, drain: 2, leak: 2, burst: 2, pipe: 1, sewage: 3, water: 1, gully: 2 },
  parks: {
    park: 2,
    garden: 2,
    tree: 2,
    branch: 2,
    playground: 3,
    bench: 1,
    grass: 1,
    overgrown: 2,
    hedge: 2,
  },
  traffic: {
    traffic: 2,
    signal: 2,
    sign: 2,
    crossing: 2,
    zebra: 2,
    junction: 1,
    speed: 1,
    bollard: 2,
    parking: 1,
  },
  pavements: {
    pavement: 3,
    kerb: 2,
    wheelchair: 2,
    pram: 1,
    uneven: 2,
    slab: 2,
    trip: 1,
    dropp: 1,
  },
};

/** Words that carry the "what is wrong" signal; weighted up in the hashed embedding. */
export const SIGNAL_WORDS: ReadonlySet<string> = new Set(
  Object.values(KEYWORDS).flatMap((weights) => Object.keys(weights)),
);
