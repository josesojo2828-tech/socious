'use client';

import { useTranslation } from '@/context/i18n.context';
import { ensureString } from '@/shared/lib/utils';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce'; // Asegúrate de tener este hook
import { Input } from '@/shared/components/atoms/Input';
import { FormField } from '@/shared/components/molecules/form/FormField';
import { SelectRequest as SelectRequestConfig } from '@/types/backend/form';
import { Spinner } from '@/shared/components/atoms/Spinner';
import { apiClient } from '@/shared/api/api.client';

interface SelectRequestProps {
  /** Configuración que viene del backend */
  config: SelectRequestConfig & { 
    label: string; 
    name: string; 
    path?: string; 
    payload?: string; 
    required?: boolean; 
    gridSpan?: number;
    className?: string; 
  };
  /** El ID seleccionado actualmente (value del input oculto) */
  value?: string; 
  /** Función que comunica el cambio a React Hook Form */
  onChange: (value: string) => void;
  /** Error de validación */
  error?: string;
}

const getGridSpanClass = (gridSpan?: number, className?: string): string => {
  if (gridSpan !== undefined) {
    if (gridSpan === 1) return 'col-span-1';
    if (gridSpan === 2) return 'col-span-1 sm:col-span-2';
    if (gridSpan === 3) return 'col-span-1 sm:col-span-2 md:col-span-3';
    if (gridSpan === 4) return 'col-span-1 sm:col-span-2 md:col-span-4';
    return `col-span-${gridSpan}`;
  }
  if (className) {
    if (className.includes('col-span-2') || className.includes('md:col-span-2') || className.includes('lg:col-span-2')) {
      return 'col-span-1 sm:col-span-2';
    }
    if (className.includes('col-span-1')) {
      return 'col-span-1';
    }
    return `col-span-1 ${className}`;
  }
  return 'col-span-1';
};

export const SelectRequest = ({ config, value, onChange, error }: SelectRequestProps) => {
  const { t } = useTranslation();
  // Estado para el texto visible (lo que escribe el usuario)
  const [displayValue, setDisplayValue] = useState('');
  
  // Estado para las sugerencias
  const [suggestions, setSuggestions] = useState<{label: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Hook de Debounce para no saturar la API
  const debouncedQuery = useDebounce(displayValue, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Efecto 1: Buscar datos cuando el usuario escribe
  useEffect(() => {
    // Solo buscamos si hay texto y NO es el texto de una selección ya hecha
    // (Para evitar que al seleccionar se vuelva a disparar la búsqueda)
    if (!debouncedQuery || !config.path || !isOpen) return;
    
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<any>(config.path!, {
          params: {
            payload: config.payload,
            param: debouncedQuery
          }
        });
        setSuggestions(response.data.list || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, config.path, config.payload, isOpen]);

  // Efecto 2: Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler al seleccionar una opción
  const handleSelect = (item: { label: string; value: string }) => {
    setDisplayValue(item.label); // Mostramos el nombre
    onChange(item.value);        // Guardamos el ID (lo que importa al backend)
    setIsOpen(false);
  };

  // Handler al escribir
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
    setIsOpen(true);
    // Si el usuario borra o cambia, reseteamos el ID seleccionado hasta que elija uno válido
    if (value) onChange(''); 
  };

  const spanClass = getGridSpanClass(config.gridSpan, config.className);

  return (
    <FormField className={spanClass} label={ensureString(t(config.label))} error={error} required={config.required}>
      <div ref={wrapperRef} className="relative">
        <Input 
          value={displayValue}
          onChange={handleInputChange}
          placeholder={`${ensureString(t('common.actions.search')) || 'Buscar'} ${ensureString(t(config.label))}...`}
          onFocus={() => displayValue && setIsOpen(true)}
          error={error ? true : false} // Pasamos el error visual al input
          autoComplete="off"
        />
        
        {/* Icono de carga absoluto a la derecha */}
        {isLoading && (
          <div className="absolute right-3 top-3">
            <Spinner size="xs" />
          </div>
        )}
        
        {/* Lista Flotante de Sugerencias */}
        {isOpen && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full bg-base-100 border border-base-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((item) => (
              <li 
                key={item.value}
                className="px-4 py-2 hover:bg-base-200 cursor-pointer text-sm"
                onClick={() => handleSelect(item)}
              >
                {item.label}
              </li>
            ))}
          </ul>
        )}
        
        {isOpen && !isLoading && suggestions.length === 0 && debouncedQuery && (
          <div className="absolute z-50 w-full bg-base-100 border border-base-300 rounded-md mt-1 p-2 text-sm text-base-content/70">
            {t('common.utils.no_results')}
          </div>
        )}
      </div>
    </FormField>
  );
};