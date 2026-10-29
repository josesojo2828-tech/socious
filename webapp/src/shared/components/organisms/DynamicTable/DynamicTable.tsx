'use client';

import { DefTable } from '@/types/backend/table.type';
import { Table } from '@/shared/components/organisms/Table';
import { Button } from '@/shared/components/atoms/Button';
import { useTranslation } from '@/context/i18n.context';
import { Pagination } from '../../molecules/Pagination';
import { Plus, Search } from 'lucide-react';
import { useState, ReactNode } from 'react';
import { ActionsType } from '@/types/requets';
import { useModalStore } from '@/shared/store/ui/useModalStore';
import NoResults from '../crud/NotResultFound';

interface DynamicTableProps {
  tableDef: DefTable;
  onAction?: (actionKey: string, item: any) => void;
  actions: ActionsType;
  isLoading?: boolean;

  renderCell?: (field: string, entity: any) => ReactNode | undefined;

  /** Extra action buttons rendered in each row's actions column */
  extraActions?: (item: any, openModal: (view: ReactNode) => void) => ReactNode;

  // Handlers
  handleAction?: (actionKey: string, item: any) => void;
  handleSearch?: (search: string) => void;
  handleCreate?: () => void;

  // Pagination
  handleNext?: () => void;
  handlePrev?: () => void;
  handleChangePage?: (page: number) => void;
}

export const DynamicTable = ({ handleCreate, tableDef, actions, isLoading, handleChangePage, handleNext, handlePrev, handleAction, handleSearch, renderCell, extraActions }: DynamicTableProps) => {

  // const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { closeModal, openModal } = useModalStore();

  return (
    <div>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-base-100 border border-base-300 rounded-xl">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          <p className="text-sm text-base-content/70 mt-4 font-semibold animate-pulse">Cargando registros...</p>
        </div>
      ) : tableDef.list && tableDef.list.length > 0 ? (
        <Table
          data={tableDef.list}
          columns={tableDef.columns}
          keyExtractor={(item) => item.id}
          zebra
          onRowClick={() => {}}
          onAction={handleAction}
          actions={actions}
          renderCell={renderCell}
          openModal={openModal}
          extraActions={extraActions ? (item) => extraActions(item, openModal) : undefined}
        />
      ) : (
        <NoResults title='No existen registros.' message='' />
      )}
    </div>
  );
};
