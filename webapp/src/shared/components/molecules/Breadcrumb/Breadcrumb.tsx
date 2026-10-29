import { cn } from '@/shared/lib/utils';
import { InternalLink } from '@/shared/components/atoms/InternalLink';
import { BreadcrumbProps } from './Breadcrumb.types';

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  if (!items.length) return null;

  return (
    <div className={cn('text-sm breadcrumbs', className)}>
      <ul>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`}>
              {/* Si tiene href y NO es el último, usamos el Link. Si no, texto plano. */}
              {!isLast && item.href ? (
                <InternalLink href={item.href} className="flex items-center gap-2">
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                </InternalLink>
              ) : (
                <span className={cn('flex items-center gap-2', isLast && 'font-medium text-primary')}>
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};