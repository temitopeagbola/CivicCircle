import { describe, expect, it } from 'vitest';

import { classifyText, moderateText, severityFor } from './mock';
import { cosineSimilarity, hashEmbedding, oneLineSummary, tokenize } from './text';

describe('mock classifier', () => {
  it.each([
    ['Huge pothole on Tooley Street, cars are swerving round it', 'roads'],
    ['The streetlight outside number 12 has been out for a week', 'lighting'],
    ['Someone has fly-tipped a mattress and bin bags by the garages', 'waste'],
    ['Fresh graffiti sprayed all over the underpass wall', 'graffiti'],
    ['Blocked drain means the road floods every time it rains', 'water'],
    ['Overgrown hedge and a fallen branch in the playground', 'parks'],
    ['Pedestrian crossing signal stuck on red', 'traffic'],
    ['Broken paving slabs make the pavement impossible for wheelchairs', 'pavements'],
    ['A strange noise every night from the empty unit', 'other'],
  ])('%s → %s', (text, category) => {
    expect(classifyText(text).category).toBe(category);
  });

  it('is more confident when more keywords match', () => {
    expect(classifyText('pothole').confidence).toBeLessThan(
      classifyText('deep pothole in the road tarmac').confidence,
    );
    expect(classifyText('a strange noise at night').confidence).toBe(0.3);
  });
});

describe('severity rules', () => {
  it('escalates immediate dangers to urgent', () => {
    expect(severityFor('Exposed wires sparking from the lamp post', 'lighting')).toBe('urgent');
    expect(severityFor('Smells of gas near the bus stop', 'other')).toBe('urgent');
  });

  it('marks injury risks as high', () => {
    expect(severityFor('Deep pothole, a cyclist nearly fell', 'roads')).toBe('high');
    expect(severityFor('Dark path to the school', 'lighting')).toBe('high');
  });

  it('uses the category default and steps down for minor issues', () => {
    expect(severityFor('Light flickers sometimes', 'lighting')).toBe('medium');
    expect(severityFor('Small tag on the bus shelter', 'graffiti')).toBe('low');
    expect(severityFor('Minor crack in the road surface', 'roads')).toBe('low');
  });
});

describe('summary', () => {
  it('takes the first sentence and strips filler', () => {
    expect(
      oneLineSummary("There's a broken bench in the park. It has been like this for weeks."),
    ).toBe('Broken bench in the park');
  });

  it('truncates long text on a word boundary', () => {
    const summary = oneLineSummary('word '.repeat(50), 40);
    expect(summary.length).toBeLessThanOrEqual(40);
    expect(summary.endsWith('…')).toBe(true);
    expect(summary).not.toMatch(/\s…$/);
  });
});

describe('hashed embeddings', () => {
  const pothole1 = hashEmbedding('Large pothole on Tooley Street near the bus stop');
  const pothole2 = hashEmbedding('Huge potholes outside the bus stop on Tooley St');
  const light = hashEmbedding('Streetlight not working on Tooley Street');

  it('canonicalises variants', () => {
    expect(tokenize('Street lights and lamp-posts')).toEqual(['light', 'light']);
    expect(tokenize('fly-tipping on the footpath')).toEqual(['rubbish', 'pavement']);
  });

  it('is unit length and deterministic', () => {
    const norm = Math.sqrt(pothole1.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
    expect(hashEmbedding('Large pothole on Tooley Street near the bus stop')).toEqual(pothole1);
  });

  it('scores paraphrases above different issues on the same street', () => {
    expect(cosineSimilarity(pothole1, pothole2)).toBeGreaterThan(0.5);
    expect(cosineSimilarity(pothole1, light)).toBeLessThan(0.3);
  });
});

describe('mock moderation', () => {
  it('flags threats and link spam but not blunt complaints', () => {
    expect(moderateText("I'm going to hurt whoever dumped this").flagged).toBe(true);
    expect(moderateText('https://a.test https://b.test https://c.test').reasons).toEqual(['spam']);
    expect(moderateText('This rubbish is disgusting and dangerous').flagged).toBe(false);
  });
});
