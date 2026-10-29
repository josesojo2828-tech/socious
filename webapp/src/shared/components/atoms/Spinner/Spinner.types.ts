import { HTMLAttributes } from 'react';

export type SpinnerType = 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity';
export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
export type SpinnerColor = 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: SpinnerType;
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
}