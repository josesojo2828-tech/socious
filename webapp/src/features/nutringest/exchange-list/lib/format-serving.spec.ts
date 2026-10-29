import { describe, expect, it } from 'vitest';

import { formatServing } from './format-serving';

/**
 * T7 / S3, S4 — one helper for the scaled practical measure.
 *
 * The nutritionist picks servings on the stepper and expects both the practical
 * measure and the grams/cc to follow. Before this helper existed the label was
 * written from `unity` alone and never recomputed, so 2 servings of milk still
 * read "1 taza" while the macros next to it already said double.
 *
 * Decisions pinned here (approved in the session log):
 *  - both sides are scaled;
 *  - `unity` stays verbatim at 1 serving, so the source text is never
 *    reformatted for no reason;
 *  - a placeholder measure ("", "0", "UNITY") is dropped instead of rendered;
 *  - grams come as a number from the exchange-food endpoint and as a string
 *    from the exchange-list detail (Prisma serialises Decimal as a string),
 *    so both are accepted;
 *  - no grams in the source means no invented value (S4).
 */
describe('formatServing', () => {
    it('scales the practical measure and the grams', () => {
        expect(formatServing('1 taza', 240, 2)).toEqual({
            label: '2 taza · 480 cc',
            grams: 480,
        });
    });

    it('shows grams at a single serving', () => {
        expect(formatServing('1 taza', 240, 1).label).toBe('1 taza · 240 cc');
    });

    it('keeps the source measure verbatim at a single serving', () => {
        expect(formatServing('½ taza', 120, 1).label).toBe('½ taza · 120 cc');
    });

    it('scales a fractional measure', () => {
        expect(formatServing('½ taza', 120, 2).label).toBe('1 taza · 240 cc');
    });

    it('works with fractional servings', () => {
        expect(formatServing('1 taza', 240, 0.5).label).toBe('0.5 taza · 120 cc');
        expect(formatServing('1 taza', 240, 1.5).grams).toBe(360);
    });

    it('accepts grams as the string Prisma sends', () => {
        expect(formatServing('1 taza', '240', 2).grams).toBe(480);
    });

    it('drops a placeholder measure and keeps the grams', () => {
        expect(formatServing('UNITY', 160, 2).label).toBe('320 g');
        expect(formatServing('0', 160, 1).label).toBe('160 g');
        expect(formatServing('', 160, 1).label).toBe('160 g');
    });

    it('uses grams when the measure is not a volume vessel', () => {
        expect(formatServing('1 rebanada', 40, 2).label).toBe('2 rebanada · 80 g');
    });

    it('does not invent grams when the source has none', () => {
        expect(formatServing('1 med', null, 2).label).toBe('2 med');
        expect(formatServing('1 med', null, 3).grams).toBeNull();
    });

    it('returns an empty label when neither side has a value', () => {
        expect(formatServing('0', null, 2).label).toBe('');
    });
});
