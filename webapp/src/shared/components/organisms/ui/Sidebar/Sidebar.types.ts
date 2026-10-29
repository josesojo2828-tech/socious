import { ReactNode } from 'react';
import { SidebarSection } from '@/types/backend/dashboard.type';

export interface SidebarProps {
  children?: ReactNode;
  className?: string;
  sidebar?: SidebarSection[];
}

