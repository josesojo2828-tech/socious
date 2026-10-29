import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Skeleton } from '@/shared/components/atoms/Skeleton';
import { TableProps } from './Table.types';
import { useTranslation } from '@/context/i18n.context';
import { ExtractValue } from '../DynamicTable/StractValue';
import { TableActions } from './TableActions';

export const Table = <T,>({
  data,
  columns,
  actions,
  zebra = true,
  compact = false,
  stickyHeader = false,
  className,
  onAction,
  renderCell,
  extraActions,
  openModal,
}: TableProps<T>) => {

  const { t } = useTranslation();

  const renderLoading = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <tr key={`skeleton-${index}`}>
        {columns.map((_, colIndex) => (
          <td key={`cell-skeleton-${colIndex}`}>
            <Skeleton variant="text" className="h-4 w-full opacity-50" />
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className={cn('table-scroll-container w-full overflow-x-auto bg-base-100', className)}>
      <table
        className={cn(
          'table w-full min-w-[600px]',
        )}
      >
        <thead className='bg-base-200 text-base-content/60 text-xs font-bold uppercase tracking-wider'>
          <tr>
            {columns.map((col, index) => (
              <th key={index} className={cn('bg-base-200/50', col.className)}>
                {t(col.label)}
              </th>
            ))}
            <th className='bg-base-200/50'>Acciones</th>
          </tr>
        </thead>

        <tbody className='divide-y divide-base-200 text-sm'>
          {
            data.map((entity: any) => (
              <tr key={`row-${entity.id}`}>
                {columns.map(col => (
                  <td key={`${entity.id}-${col.field}-${col.formatter || 'default'}`}>
                    {renderCell?.(col.field, entity) ?? <ExtractValue formatter={col.formatter} value={col.field} object={entity} />}
                  </td>
                ))}

                <td className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <TableActions
                      t={t}
                      actions={actions}
                      onDelete={() => onAction && onAction('delete', entity)}
                      onUpdate={() => onAction && onAction('update', entity)}
                      onView={() => onAction && onAction('view', entity)}
                    />
                    {extraActions && openModal && extraActions(entity, openModal)}
                  </div>
                </td>

              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
};
