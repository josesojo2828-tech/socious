'use client';

import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { TabItem } from '@/shared/components/molecules/TabItem'; // Ajusta a atoms si lo moviste
import { TabsProps } from './Tabs.types';

const variantMap = {
  bordered: 'tabs-bordered',
  lifted: 'tabs-lifted',
  boxed: 'tabs-boxed',
};

export const Tabs = ({
  items,
  defaultValue,
  variant = 'bordered',
  fullWidth = false,
  onChange,
  className,
  contentClassName,
}: TabsProps) => {
  
  // Inicializamos estado con el defaultValue o el primero de la lista
  const [activeTab, setActiveTab] = useState<string>(
    defaultValue || (items.length > 0 ? items[0].value : '')
  );

  const handleTabClick = (value: string | number) => {
    const newVal = String(value);
    setActiveTab(newVal);
    onChange?.(newVal);
  };

  // Encontramos el contenido activo
  const activeContent = items.find((item) => item.value === activeTab)?.content;

  return (
    <div className={cn('flex flex-col w-full', className)}>
      
      {/* HEADER: Lista de pestañas */}
      <div 
        role="tablist" 
        className={cn(
          'tabs overflow-x-auto nav-scrollbar',
          variantMap[variant],
          fullWidth && 'w-full'
        )}
      >
        {items.map((item) => (
          <TabItem
            key={item.value}
            label={item.label}
            value={item.value}
            icon={item.icon}
            isActive={activeTab === item.value}
            onClick={!item.disabled ? handleTabClick : undefined}
            className={cn(
              'whitespace-nowrap shrink-0',
              item.disabled && 'opacity-50 cursor-not-allowed',
              fullWidth && 'flex-1'
            )}
          />
        ))}
      </div>

      {/* BODY: Contenido de la pestaña activa */}
      <div 
        className={cn(
          'mt-4 p-1 animate-in fade-in slide-in-from-bottom-1 duration-300',
          // Si es 'boxed', a veces queremos un padding extra o borde, depende del diseño
          variant === 'boxed' && 'bg-base-200 rounded-box p-4 mt-0 rounded-t-none',
          variant === 'lifted' && 'border-base-300 border-t-0 p-6 rounded-b-box bg-base-100',
          contentClassName
        )}
      >
        {activeContent}
      </div>
    </div>
  );
};