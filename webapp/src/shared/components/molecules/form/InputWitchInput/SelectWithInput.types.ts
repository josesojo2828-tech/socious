import { InputHTMLAttributes } from 'react';
// Importamos la interfaz de nuestra molécula Select existente
import { SelectProps } from '../Select';
import { InputProps } from '@/shared/components/atoms/Input';

export interface SelectWithInputProps {
  /** * Props para el select.
   * Usamos SelectProps en lugar de SelectHTMLAttributes para que coincidan 
   * los tipos estrictos de 'color', 'variant' y 'size'.
   */
  selectProps: SelectProps;

  /** Props para el input (value, placeholder, onChange...) */
  inputProps: InputProps;

  className?: string;
}