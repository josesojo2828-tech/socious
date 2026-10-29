import { describe, it, expect } from 'vitest';
import {
  evaluatePediatricDiagnosis,
  calculateImc,
  mapZoneToTriaxialZone,
  evaluateCombinedPediatricDiagnosis,
  computeTriaxialIndices,
} from './pediatric-diagnostic.engine';
import {
  InnSisvanZone,
  INN_SISVAN_ZONE_ORDER,
  INN_SISVAN_ZONE_LABELS,
  normalizeInnSisvanZone,
} from './inn-sisvan-zones';

describe('Pediatric Diagnostic Engine', () => {
  it('debe calcular correctamente el IMC pediátrico', () => {
    expect(calculateImc(20, 110)).toBe(16.53);
    expect(calculateImc(0, 100)).toBeNull();
  });

  it('debe generar el diagnóstico de Eutrófico para zona NORMAL', () => {
    const res = evaluatePediatricDiagnosis({
      ageYears: 4,
      weightKg: 16,
      heightCm: 102,
      selectedZone: InnSisvanZone.NORMAL,
    });
    expect(res.title).toContain('Normopeso / Eutrófico');
    expect(res.clinicalAlert).toBe('NORMAL');
  });

  it('debe generar alerta CRITICAL para DEFICIT_GRAVE', () => {
    const res = evaluatePediatricDiagnosis({
      ageYears: 2,
      weightKg: 8,
      heightCm: 78,
      selectedZone: InnSisvanZone.DEFICIT_GRAVE,
    });
    expect(res.title).toContain('Desnutrición Grave');
    expect(res.clinicalAlert).toBe('CRITICAL');
  });

  describe('mapZoneToTriaxialZone', () => {
    it('mapea ZONA_1 y ZONA_2 a BAJO', () => {
      expect(mapZoneToTriaxialZone('ZONA_1')).toBe('BAJO');
      expect(mapZoneToTriaxialZone('ZONA_2')).toBe('BAJO');
      expect(mapZoneToTriaxialZone(InnSisvanZone.DEFICIT_GRAVE)).toBe('BAJO');
      expect(mapZoneToTriaxialZone(InnSisvanZone.DEFICIT_MODERADO)).toBe('BAJO');
    });

    it('mapea ZONA_3 y NORMAL a NORMAL', () => {
      expect(mapZoneToTriaxialZone('ZONA_3')).toBe('NORMAL');
      expect(mapZoneToTriaxialZone(InnSisvanZone.NORMAL)).toBe('NORMAL');
    });

    it('mapea ZONA_4 y ZONA_5 a ALTO', () => {
      expect(mapZoneToTriaxialZone('ZONA_4')).toBe('ALTO');
      expect(mapZoneToTriaxialZone('ZONA_5')).toBe('ALTO');
      expect(mapZoneToTriaxialZone(InnSisvanZone.EXCESO)).toBe('ALTO');
      expect(mapZoneToTriaxialZone(InnSisvanZone.EXCESO_SEVERO)).toBe('ALTO');
    });

    it('mapea percentiles y z-scores', () => {
      expect(mapZoneToTriaxialZone(-2.5)).toBe('BAJO');
      expect(mapZoneToTriaxialZone(0)).toBe('NORMAL');
      expect(mapZoneToTriaxialZone(2.5)).toBe('ALTO');
      expect(mapZoneToTriaxialZone(5, 'percentile')).toBe('BAJO'); // percentil 5 explícito
      expect(mapZoneToTriaxialZone(8)).toBe('BAJO'); // percentil 8 inferido (> 5 y < 10)
      expect(mapZoneToTriaxialZone(50)).toBe('NORMAL'); // percentil 50
      expect(mapZoneToTriaxialZone(95)).toBe('ALTO'); // percentil 95
    });
  });

  describe('evaluateCombinedPediatricDiagnosis — Las 9 combinaciones de la tabla', () => {
    it('1. P/T normal, P/E bajo, T/E bajo -> Actualmente normal con desnutrición pasada', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'NORMAL',
        pesoEdad: 'BAJO',
        tallaEdad: 'BAJO',
      });
      expect(res.title).toBe('Actualmente normal con desnutrición pasada');
      expect(res.severity).toBe('WARNING');
      expect(res.clinicalDescription).toContain('Desnutrición crónica recuperada o armónica con talla baja');
    });

    it('2. P/T normal, P/E normal, T/E normal -> Normal', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'NORMAL',
        pesoEdad: 'NORMAL',
        tallaEdad: 'NORMAL',
      });
      expect(res.title).toBe('Normal');
      expect(res.severity).toBe('NORMAL');
      expect(res.classification).toContain('Eutrófico');
    });

    it('3. P/T normal, P/E alto, T/E alto -> Alto, moderadamente nutrido', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'NORMAL',
        pesoEdad: 'ALTO',
        tallaEdad: 'ALTO',
      });
      expect(res.title).toBe('Alto, moderadamente nutrido');
      expect(res.severity).toBe('NORMAL');
      expect(res.clinicalDescription).toContain('Talla alta armónica');
    });

    it('4. P/T bajo, P/E bajo, T/E alto -> Actualmente desnutrido ++', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'BAJO',
        pesoEdad: 'BAJO',
        tallaEdad: 'ALTO',
      });
      expect(res.title).toBe('Actualmente desnutrido ++');
      expect(res.severity).toBe('CRITICAL');
      expect(res.clinicalDescription).toContain('Desnutrición aguda severa en paciente de talla alta');
    });

    it('5. P/T bajo, P/E bajo, T/E normal -> Actualmente desnutrido +', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'BAJO',
        pesoEdad: 'BAJO',
        tallaEdad: 'NORMAL',
      });
      expect(res.title).toBe('Actualmente desnutrido +');
      expect(res.severity).toBe('ALERT');
      expect(res.clinicalDescription).toContain('Desnutrición aguda típica con talla preservada');
    });

    it('6. P/T bajo, P/E normal, T/E alto -> Actualmente desnutrido', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'BAJO',
        pesoEdad: 'NORMAL',
        tallaEdad: 'ALTO',
      });
      expect(res.title).toBe('Actualmente desnutrido');
      expect(res.severity).toBe('ALERT');
      expect(res.clinicalDescription).toContain('Desnutrición aguda / emaciación relativa');
    });

    it('7. P/T alto, P/E alto, T/E bajo -> Obeso', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'ALTO',
        pesoEdad: 'ALTO',
        tallaEdad: 'BAJO',
      });
      expect(res.title).toBe('Obeso');
      expect(res.severity).toBe('ALERT');
      expect(res.clinicalDescription).toContain('Obesidad con retraso estatural');
    });

    it('8. P/T alto, P/E normal, T/E bajo -> Sobrepeso con pasado de desnutrición', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'ALTO',
        pesoEdad: 'NORMAL',
        tallaEdad: 'BAJO',
      });
      expect(res.title).toBe('Sobrepeso con pasado de desnutrición');
      expect(res.severity).toBe('WARNING');
      expect(res.clinicalDescription).toContain('Exceso ponderal sobreimpuesto a desmedro crónico previo');
    });

    it('9. P/T alto, P/E alto, T/E normal -> Sobrepeso, pero no obeso', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'ALTO',
        pesoEdad: 'ALTO',
        tallaEdad: 'NORMAL',
      });
      expect(res.title).toBe('Sobrepeso, pero no obeso');
      expect(res.severity).toBe('WARNING');
      expect(res.clinicalDescription).toContain('Sobrepeso simple con talla normal');
    });

    it('Fallback: P/T bajo, P/E bajo, T/E bajo -> Desnutrición crónica reagudizada', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'BAJO',
        pesoEdad: 'BAJO',
        tallaEdad: 'BAJO',
      });
      expect(res.title).toBe('Desnutrición crónica reagudizada');
      expect(res.severity).toBe('CRITICAL');
    });

    it('Fallback: P/T alto, P/E alto, T/E alto -> Sobrepeso / Obesidad generalizada', () => {
      const res = evaluateCombinedPediatricDiagnosis({
        pesoTalla: 'ALTO',
        pesoEdad: 'ALTO',
        tallaEdad: 'ALTO',
      });
      expect(res.title).toBe('Sobrepeso / Obesidad generalizada');
      expect(res.severity).toBe('ALERT');
    });
  });

  describe('evaluatePediatricDiagnosis con triaxialIndices integrado', () => {
    it('integra el diagnóstico combinado cuando se envían los 3 índices', () => {
      const res = evaluatePediatricDiagnosis({
        ageYears: 5,
        weightKg: 14,
        heightCm: 105,
        selectedZone: InnSisvanZone.NORMAL,
        triaxialIndices: {
          pesoTalla: 'BAJO',
          pesoEdad: 'BAJO',
          tallaEdad: 'NORMAL',
        },
      });
      expect(res.combinedDiagnosis).toBeDefined();
      expect(res.combinedDiagnosis?.title).toBe('Actualmente desnutrido +');
      expect(res.combinedDiagnosis?.severity).toBe('ALERT');
    });
  });

  describe('computeTriaxialIndices (reacción en tiempo real)', () => {
    it('evalúa paciente eutrófico armónico', () => {
      const res = computeTriaxialIndices({
        ageYears: 5,
        weightKg: 18.5,
        heightCm: 110,
        gender: 'MALE',
      });
      expect(res.pesoTalla).toBe('NORMAL');
      expect(res.pesoEdad).toBe('NORMAL');
      expect(res.tallaEdad).toBe('NORMAL');
    });

    it('detecta desnutrición aguda (P/T bajo y P/E bajo con talla normal)', () => {
      const res = computeTriaxialIndices({
        ageYears: 5,
        weightKg: 11,
        heightCm: 110,
        gender: 'MALE',
      });
      expect(res.pesoTalla).toBe('BAJO');
      expect(res.pesoEdad).toBe('BAJO');
      expect(res.tallaEdad).toBe('NORMAL');
    });

    it('detecta sobrepeso/obesidad (P/T alto y P/E alto con talla normal)', () => {
      const res = computeTriaxialIndices({
        ageYears: 5,
        weightKg: 30,
        heightCm: 110,
        gender: 'MALE',
      });
      expect(res.pesoTalla).toBe('ALTO');
      expect(res.pesoEdad).toBe('ALTO');
      expect(res.tallaEdad).toBe('NORMAL');
    });

    it('detecta retraso estatural / desmedro histórico (T/E bajo)', () => {
      const res = computeTriaxialIndices({
        ageYears: 5,
        weightKg: 13,
        heightCm: 90,
        gender: 'MALE',
      });
      expect(res.tallaEdad).toBe('BAJO');
    });
  });

  describe('INN-SISVAN Zone Labels and Normalization', () => {
    it('cada zona en INN_SISVAN_ZONE_ORDER tiene una etiqueta legible no vacía', () => {
      expect(INN_SISVAN_ZONE_ORDER.length).toBeGreaterThan(0);
      for (const zone of INN_SISVAN_ZONE_ORDER) {
        const label = INN_SISVAN_ZONE_LABELS[zone];
        expect(label).toBeDefined();
        expect(typeof label).toBe('string');
        expect(label.trim().length).toBeGreaterThan(0);
      }
    });

    it('normaliza zonas legacy ZONA_1 a ZONA_5', () => {
      expect(normalizeInnSisvanZone('ZONA_1')).toBe(InnSisvanZone.DEFICIT_GRAVE);
      expect(normalizeInnSisvanZone('ZONA_2')).toBe(InnSisvanZone.DEFICIT_MODERADO);
      expect(normalizeInnSisvanZone('ZONA_3')).toBe(InnSisvanZone.NORMAL);
      expect(normalizeInnSisvanZone('ZONA_4')).toBe(InnSisvanZone.EXCESO);
      expect(normalizeInnSisvanZone('ZONA_5')).toBe(InnSisvanZone.EXCESO_SEVERO);
    });

    it('mantiene zonas válidas y hace fallback a NORMAL para valores nulos o inválidos', () => {
      expect(normalizeInnSisvanZone(InnSisvanZone.DEFICIT_LEVE)).toBe(InnSisvanZone.DEFICIT_LEVE);
      expect(normalizeInnSisvanZone(InnSisvanZone.EXCESO_LEVE)).toBe(InnSisvanZone.EXCESO_LEVE);
      expect(normalizeInnSisvanZone(null)).toBe(InnSisvanZone.NORMAL);
      expect(normalizeInnSisvanZone(undefined)).toBe(InnSisvanZone.NORMAL);
      expect(normalizeInnSisvanZone('INVALID_ZONE')).toBe(InnSisvanZone.NORMAL);
    });
  });
});
