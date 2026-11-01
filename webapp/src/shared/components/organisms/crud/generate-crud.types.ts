
import { ReactNode } from 'react';
import { ActionsType } from '@/types/requets';

export interface Tab {
  label: string;
  queryParam?: Record<string, unknown>;
}

export interface GenerateCrudProps {

    path: {
        list: string;
        create: string;
        view: (id: string) => string;
        update: (id: string) => string;
        delete: (id: string) => string;

        sendCreate?: string;
        sendUpdate?: (id: string) => string;
    }

    fichaComponent: (id: string, HandleUpdate: (id: string) => void, HandleDelete: (id: string) => void) => void;

    object: string,
    title?: string;

    renderCell?: (field: string, entity: unknown) => ReactNode;

    handlers?: {
        create?: (data: unknown, cb: () => void) => Promise<unknown>;
        update?: (data: unknown, cb: () => void) => Promise<unknown>;
        delete?: (id: string, cb: () => void) => Promise<unknown>;
    }
    onReload?: () => void;

    // --- Archive/Unarchive extension ---
    /** Tabs to display above the table (e.g., Active / Archived) */
    tabs?: Tab[];
    /**
     * Extra action buttons rendered in each row's action column.
     * The third argument lets the callback refresh the current list after a
     * server-side change (e.g. archiving a row so it leaves the active tab).
     */
    extraActions?: (item: unknown, openModal: (view: ReactNode) => void, reload?: () => void) => ReactNode;
    /** User permits for gating extraActions (e.g., ['PATIENT_DELETE']) */
    userPermits?: string[];
    /** External modal opener (from useModalStore) */
    openModal?: (view: ReactNode) => void;
    /** Override default actions (view/update/delete) based on context (e.g., hide edit for archived items) */
    actionsOverride?: Partial<ActionsType>;
    /** Callback when active tab changes, receives the tab index */
    onTabChange?: (tabIndex: number) => void;

}
