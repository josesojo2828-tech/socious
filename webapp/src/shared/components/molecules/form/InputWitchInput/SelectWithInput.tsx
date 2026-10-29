import { cn } from '@/shared/lib/utils';
import { Select } from '../Select';
import { Input } from '@/shared/components/atoms/Input';
import { SelectWithInputProps } from './SelectWithInput.types';

export const SelectWithInput = ({
  selectProps,
  inputProps,
  className,
}: SelectWithInputProps) => {
  return (
    <div className={cn('join w-full', className)}>
      {/* SELECT */}
      <Select
        {...selectProps}
        // Forzamos que no tenga ancho completo para que comparta espacio
        fullWidth={false} 
        className={cn('join-item w-1/3', selectProps.className)}
      />

      {/* INPUT */}
      <Input
        {...inputProps}
        className={cn('join-item w-2/3', inputProps.className)}
      />
    </div>
  );
};