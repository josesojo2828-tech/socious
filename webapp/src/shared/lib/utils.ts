import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ensureString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.title === 'string') return val.title;
    if (typeof val.description === 'string') return val.description;
    if (typeof val.label === 'string') return val.label;
    if (typeof val.name === 'string') return val.name;
    try {
      return JSON.stringify(val);
    } catch {
      return '[Object]';
    }
  }
  return String(val);
}