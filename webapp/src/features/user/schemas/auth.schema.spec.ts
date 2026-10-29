import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSchema } from './auth.schema';

/**
 * S7 (legal-compliance) — gate de edad del registro, independiente del timezone.
 *
 * El cliente duplicaba el cálculo del servidor con getters LOCALES
 * (`getFullYear`/`getMonth`/`getDate`) sobre una fecha parseada como UTC
 * medianoche: en cualquier navegador al oeste de UTC (el mercado del producto
 * es `America/Caracas`) una persona que cumplía 18 años MAÑANA pasaba el gate
 * del cliente y el servidor la rechazaba (o al revés). Cliente y servidor
 * deben calcular EXACTAMENTE lo mismo: comparar fechas calendario en UTC.
 *
 * El instante del reloj queda fijo (`vi.setSystemTime`) para que el resultado
 * no dependa de la hora a la que corre la suite. La suite se ejecuta con
 * `TZ=America/Caracas` y `TZ=UTC` para comprobar que el veredicto no cambia.
 */
const NOW = new Date('2026-06-15T12:00:00.000Z');

/** Cumple 18 años HOY (en calendario UTC). */
const TURNS_18_TODAY = '2008-06-15';

/** Cumple 18 años MAÑANA (en calendario UTC). */
const TURNS_18_TOMORROW = '2008-06-16';

/** Menor de edad hoy — 17 años cumplidos. */
const MINOR = '2009-06-15';

const AGE_ERROR = 'Debes ser mayor de 18 años para crear una cuenta';

const basePayload = {
    firstName: 'Ana',
    lastName: 'Diaz',
    email: 'ana@nutringest.test',
    password: 'secret123',
    confirmPassword: 'secret123',
    gender: 'FEMALE' as const,
};

const parseWith = (birthDate: string) =>
    registerSchema.safeParse({ ...basePayload, birthDate });

describe('registerSchema — S7 gate de edad sin dependencia de timezone', () => {
    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(() => {
        vi.setSystemTime(NOW);
    });

    it('RECHAZA a quien cumple 18 años mañana', () => {
        const parsed = parseWith(TURNS_18_TOMORROW);
        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            const birthDateIssue = parsed.error.issues.find(
                (issue) => issue.path[0] === 'birthDate',
            );
            expect(birthDateIssue?.message).toBe(AGE_ERROR);
        }
    });

    it('ACEPTA a quien cumple 18 años hoy', () => {
        expect(parseWith(TURNS_18_TODAY).success).toBe(true);
    });

    it('RECHAZA a un menor de edad (17 años)', () => {
        expect(parseWith(MINOR).success).toBe(false);
    });

    it('ACEPTA a un adulto (30 años)', () => {
        expect(parseWith('1990-05-15').success).toBe(true);
    });

    it('RECHAZA una fecha de nacimiento vacía', () => {
        const parsed = parseWith('');
        expect(parsed.success).toBe(false);
    });
});
