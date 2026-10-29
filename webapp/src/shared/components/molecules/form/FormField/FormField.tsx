import { cn } from '@/shared/lib/utils';
import { FormFieldProps } from './FormField.types';

export const FormField = ({
  children,
  label,
  error,
  hint,
  htmlFor,
  topRightLabel,
  className,
  required,
}: FormFieldProps) => {
  return (
    <div className={cn('form-control w-full space-y-1', className)}>
      {/* Header del campo: Label + TopRight */}
      {(label || topRightLabel) && (
        <div className="flex items-center justify-between px-0.5 mb-1">
          {label && (
            <label 
              htmlFor={htmlFor} 
              className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              {label}
              {required && <span className="text-rose-500 font-bold ml-0.5" title="Campo requerido">*</span>}
            </label>
          )}
          {topRightLabel && (
            <span className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              {topRightLabel}
            </span>
          )}
        </div>
      )}

      {/* El Input/Select inyectado */}
      {children}

      {/* Footer del campo: Error o Hint */}
      {(error || hint) && (
        <div className="px-0.5 pt-0.5">
          <span
            className={cn(
              'text-xs block transition-all duration-200',
              error 
                ? 'text-rose-600 font-medium flex items-center gap-1' 
                : 'text-slate-500'
            )}
          >
            {error || hint}
          </span>
        </div>
      )}
    </div>
  );
};


