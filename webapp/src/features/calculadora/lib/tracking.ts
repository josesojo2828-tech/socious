import { apiClient } from '@/shared/api/api.client';
import { CalculatorUsageEndpoints } from '../service/calculator-usage.endpoints';

type CalculatorType = 'pacientes' | 'deportistas' | 'pediatria';
type Source = 'public' | 'dashboard';

export function trackCalculatorUse(
  calculatorType: CalculatorType,
  inputSnapshot?: Record<string, any>,
  resultSnapshot?: Record<string, any>,
  source: Source = 'dashboard',
) {
  apiClient
    .post(CalculatorUsageEndpoints.api.log, {
      calculatorType,
      inputSnapshot,
      resultSnapshot,
      source,
    })
    .catch(() => {});
}
