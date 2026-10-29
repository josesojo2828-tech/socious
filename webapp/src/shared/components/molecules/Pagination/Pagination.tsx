import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/atoms/Button';
import { PaginationProps } from './Pagination.types';
import { ArrowBigLeftDashIcon, ArrowBigRightDashIcon, ArrowLeftCircle, ArrowLeftIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({
  currentPage,
  totalPages,
  handleNext,
  handlePrev,
  handleChangePage,
  hideOnSinglePage = true,
  className,
}: PaginationProps) => {

  // if (hideOnSinglePage && totalPages <= 1) return null;
  return (
    <nav className={cn('join', className)}>
      {/* Botón Anterior */}
      <div className="flex justify-between flex-1 sm:hidden">
        <Button onClick={handlePrev} variant="outline" size="sm">Anterior</Button>
        <Button onClick={handleNext} variant="outline" size="sm">Siguiente</Button>
      </div>

      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">

        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            className="p-1 min-w-[36px]"
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-base-content/70 hover:bg-base-200 hover:text-base-content`}
            >
              Página {currentPage} de {totalPages}
            </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="p-1 min-w-[36px]"
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
};