import { InputHTMLAttributes } from 'react';

export type RadioVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
export type RadioSize = 'xs' | 'sm' | 'md' | 'lg';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: RadioVariant;
  size?: RadioSize;
  className?: string;
}