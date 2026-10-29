export interface PaginationProps {
  /** Página actual (1-based index) */
  currentPage: number;

  /** Total de páginas disponibles */
  totalPages: number;

  /** Función al cambiar de página */
  // onPageChange: (page: number) => void;

  handleNext?: () => void;
  handlePrev?: () => void;
  handleChangePage?: (page: number) => void;

  /** Ocultar si solo hay 1 página */
  hideOnSinglePage?: boolean;

  className?: string;
}