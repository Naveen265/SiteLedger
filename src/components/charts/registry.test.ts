import { describe, expect, it } from 'vitest';
import { ALL_CHARTS } from './registry';
import en from '@/i18n/messages/en.json';
import ta from '@/i18n/messages/ta.json';
import hi from '@/i18n/messages/hi.json';

/**
 * The rule "no chart ships without its explanation" is only real if it is
 * enforced. These tests fail the build when a chart is added to the registry
 * without the explain entry that describes how its number is produced.
 */

type Messages = Record<string, unknown>;

/** Reads a dotted key path out of a nested message object. */
function lookup(messages: Messages, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Messages)[part] : undefined),
    messages,
  );
}

describe('chart registry', () => {
  it('gives every chart an explain entry with a title and a body', () => {
    for (const chart of ALL_CHARTS) {
      expect(lookup(en, `explain.${chart.explain}.title`), `${chart.id} title`).toBeTypeOf('string');
      expect(lookup(en, `explain.${chart.explain}.body`), `${chart.id} body`).toBeTypeOf('string');
    }
  });

  it('gives every chart a title key that resolves', () => {
    for (const chart of ALL_CHARTS) {
      expect(lookup(en, chart.titleKey), `${chart.id} titleKey`).toBeTypeOf('string');
    }
  });

  it('writes each explanation in plain language, with all three required parts', () => {
    for (const chart of ALL_CHARTS) {
      const body = lookup(en, `explain.${chart.explain}.body`) as string;
      expect(body, `${chart.id}`).toContain('What this shows');
      expect(body, `${chart.id}`).toContain('How it is calculated');
      expect(body, `${chart.id}`).toContain('What is excluded');
    }
  });

  it('translates every explanation into Tamil and Hindi', () => {
    for (const chart of ALL_CHARTS) {
      expect(lookup(ta, `explain.${chart.explain}.body`), `${chart.id} ta`).toBeTypeOf('string');
      expect(lookup(hi, `explain.${chart.explain}.body`), `${chart.id} hi`).toBeTypeOf('string');
    }
  });

  it('names each chart explain entry after the chart itself, so they cannot drift', () => {
    for (const chart of ALL_CHARTS) {
      expect(chart.explain).toBe(chart.id);
    }
  });
});
