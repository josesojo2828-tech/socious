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

export function ensureString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const record = val as Record<string, unknown>;
    if (typeof record.title === 'string') return record.title;
    if (typeof record.description === 'string') return record.description;
    if (typeof record.label === 'string') return record.label;
    if (typeof record.name === 'string') return record.name;
    try {
      return JSON.stringify(val);
    } catch {
      return '[Object]';
    }
  }
  return String(val);
}