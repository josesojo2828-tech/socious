'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/shared/api/api.client';

export interface EnabledCountry {
  id: string;
  code: string;
  name: string;
  phoneCode: string;
  flagEmoji: string;
  currency: string;
  isActive: boolean;
}

const DEFAULT_COUNTRIES: EnabledCountry[] = [
  { id: '1', code: 'VE', name: 'Venezuela', phoneCode: '+58', flagEmoji: '🇻🇪', currency: 'VES', isActive: true },
  { id: '2', code: 'MX', name: 'México', phoneCode: '+52', flagEmoji: '🇲🇽', currency: 'MXN', isActive: true },
  { id: '3', code: 'AR', name: 'Argentina', phoneCode: '+54', flagEmoji: '🇦🇷', currency: 'ARS', isActive: true },
  { id: '4', code: 'US', name: 'Estados Unidos', phoneCode: '+1', flagEmoji: '🇺🇸', currency: 'USD', isActive: true },
  { id: '5', code: 'CO', name: 'Colombia', phoneCode: '+57', flagEmoji: '🇨🇴', currency: 'COP', isActive: true },
  { id: '6', code: 'CL', name: 'Chile', phoneCode: '+56', flagEmoji: '🇨🇱', currency: 'CLP', isActive: true },
  { id: '7', code: 'ES', name: 'España', phoneCode: '+34', flagEmoji: '🇪🇸', currency: 'EUR', isActive: true },
];

interface CountryPhoneInputProps {
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  name?: string;
  id?: string;
}

/** Extrae prefijo internacional + dígitos de un valor E.164/suelto.
 *  `code` indefinido significa "no tocar el prefijo seleccionado". */
function parsePhoneValue(value: string, countries: EnabledCountry[]): { code?: string; number: string } {
  if (!value) return { number: '' };

  const trimmed = value.trim();
  if (!trimmed) return { number: '' };

  // Prefijos más largos primero para matchear el más específico.
  const sorted = [...countries].sort((a, b) => b.phoneCode.length - a.phoneCode.length);
  const matched = sorted.find((c) => trimmed.startsWith(c.phoneCode));

  if (matched) {
    return { code: matched.phoneCode, number: trimmed.slice(matched.phoneCode.length).replace(/\D/g, '') };
  }
  if (trimmed.startsWith('+')) {
    const codeMatch = trimmed.match(/^(\+\d{1,4})/);
    if (codeMatch) {
      return { code: codeMatch[1], number: trimmed.slice(codeMatch[1].length).replace(/\D/g, '') };
    }
    return { number: trimmed.replace(/\D/g, '') };
  }
  return { number: trimmed.replace(/\D/g, '') };
}

export default function CountryPhoneInput({
  value = '',
  onChange,
  disabled = false,
  placeholder = '4141234567',
  className = '',
  name,
  id,
}: CountryPhoneInputProps) {
  const [countries, setCountries] = useState<EnabledCountry[]>(DEFAULT_COUNTRIES);
  const [selectedPhoneCode, setSelectedPhoneCode] = useState<string>('+58');
  const [localNumber, setLocalNumber] = useState<string>('');

  // Fetch active countries from backend
  useEffect(() => {
    let isMounted = true;
    async function loadCountries() {
      try {
        const res = await apiClient.get<EnabledCountry[]>('/api/countries/active');
        if (isMounted && Array.isArray(res.data) && res.data.length > 0) {
          setCountries(res.data);
        }
      } catch (err) {
        // Silently fallback to DEFAULT_COUNTRIES
      }
    }
    loadCountries();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sincroniza estado interno cuando cambia la prop `value` o `countries`.
  // Se ajusta en render (patrón de react.dev) en lugar de un effect con
  // setState síncrono; `prevSync` null reproduce la corrida inicial al montar.
  const [prevSync, setPrevSync] = useState<{ value: string; countries: EnabledCountry[] } | null>(null);
  if (prevSync === null || value !== prevSync.value || countries !== prevSync.countries) {
    setPrevSync({ value, countries });
    const parsed = parsePhoneValue(value, countries);
    if (parsed.code !== undefined) {
      setSelectedPhoneCode(parsed.code);
    }
    setLocalNumber(parsed.number);
  }

  const handlePhoneCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setSelectedPhoneCode(newCode);
    const cleanDigits = localNumber.replace(/\D/g, '');
    const fullE164 = cleanDigits ? `${newCode}${cleanDigits}` : '';
    onChange?.(fullE164);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanDigits = rawVal.replace(/\D/g, '');
    setLocalNumber(cleanDigits);
    const fullE164 = cleanDigits ? `${selectedPhoneCode}${cleanDigits}` : '';
    onChange?.(fullE164);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative shrink-0">
        <select
          value={selectedPhoneCode}
          onChange={handlePhoneCodeChange}
          disabled={disabled}
          className="appearance-none rounded-xl border border-base-300 bg-base-100 py-2.5 pl-3 pr-8 text-sm font-medium text-base-content focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 cursor-pointer"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.phoneCode}>
              {c.flagEmoji} {c.phoneCode} ({c.code})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-base-content/50">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      <input
        type="tel"
        id={id}
        name={name}
        value={localNumber}
        onChange={handleNumberChange}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
      />
    </div>
  );
}
