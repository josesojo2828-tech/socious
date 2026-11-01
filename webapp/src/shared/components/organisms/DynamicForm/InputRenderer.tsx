import { useFormContext, Controller, RegisterOptions } from 'react-hook-form';
import { FormInputType } from '@/types/backend/form';
import { Input } from '@/shared/components/atoms/Input';
import { Textarea } from '@/shared/components/atoms/Textarea';
import { Checkbox } from '@/shared/components/atoms/Checkbox';
import { Select } from '@/shared/components/molecules/form/Select';
import { FormField } from '@/shared/components/molecules/form/FormField';
import { SelectRequest, SelectRequestProps } from './SelectRequest';
import { useTranslation } from '@/context/i18n.context';
import { ensureString } from '@/shared/lib/utils';
import { MarkdownEditor } from './MarkdownEditor';

interface InputRendererProps {
  field: FormInputType;
}

const getGridSpanClass = (gridSpan?: number, className?: string): string => {
  if (gridSpan !== undefined) {
    if (gridSpan === 1) return 'col-span-1 w-full';
    if (gridSpan === 2) return 'col-span-1 sm:col-span-2 w-full';
    if (gridSpan === 3) return 'col-span-1 sm:col-span-2 md:col-span-3 w-full';
    if (gridSpan === 4) return 'col-span-1 sm:col-span-2 md:col-span-4 w-full';
    return `col-span-${gridSpan} w-full`;
  }
  if (className) {
    const isColSpan2 = className.includes('col-span-2') || className.includes('md:col-span-2') || className.includes('lg:col-span-2');
    const cleanClass = className
      .replace(/md:w-[^\s]+/g, '')
      .replace(/w-[1-9]\/[1-9]/g, '')
      .trim();
    if (isColSpan2) {
      return `col-span-1 sm:col-span-2 w-full ${cleanClass}`.trim();
    }
    return `col-span-1 w-full ${cleanClass}`.trim();
  }
  return 'col-span-1 w-full';
};

export const InputRenderer = ({ field }: InputRendererProps) => {
  const { t } = useTranslation();
  const { register, control, formState: { errors } } = useFormContext();

  console.log(field);

  // Extraer mensaje de error si existe
  const errorMessage = errors[field.name]?.message as string | undefined;

  // Reglas de validación dinámicas basadas en los DTOs/esquemas del backend
  const rules: RegisterOptions = {
    required: field.required ? t('form.validation_errors.required') : false,
  };

  if (field.min !== undefined && field.min !== null && field.min !== '') {
    rules.min = {
      value: field.min,
      message: t('form.validation_errors.number_min', { min: field.min })
    };
  }

  if (field.max !== undefined && field.max !== null && field.max !== '') {
    rules.max = {
      value: field.max,
      message: t('form.validation_errors.number_max', { max: field.max })
    };
  }

  if (field.minLength !== undefined && field.minLength !== null) {
    rules.minLength = {
      value: field.minLength,
      message: t('form.validation_errors.min_length', { count: field.minLength })
    };
  }

  if (field.maxLength !== undefined && field.maxLength !== null) {
    rules.maxLength = {
      value: field.maxLength,
      message: t('form.validation_errors.max_length', { count: field.maxLength })
    };
  }

  if (field.pattern) {
    rules.pattern = {
      value: new RegExp(field.pattern),
      message: t('form.validation_errors.format_invalid')
    };
  }

  const spanClass = getGridSpanClass(field.gridSpan, field.className);

  switch (field.controlType) {
    case 'input': {
      if (field.type === 'hidden') {
        return (
          <input
            {...register(field.name, rules)}
            type="hidden"
          />
        );
      }
      const isCalculated = ['bmi', 'idealWeight', 'adjustedWeight'].includes(field.name);
      return (
        <FormField 
          className={spanClass} 
          label={
            <span className="flex items-center gap-1.5">
              {ensureString(t(field.label))}
              {isCalculated && (
                <span className="text-[9px] bg-success/10 text-success border border-success/30 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">
                  Auto
                </span>
              )}
            </span>
          } 
          error={errorMessage} 
          required={field.required}
        >
          <Input
            {...register(field.name, rules)}
            type={field.type}
            placeholder={ensureString(t(field.placeholder || ''))}
            disabled={field.disabled}
            readOnly={isCalculated}
            autoComplete={field.autoComplete || (field.type === 'password' ? 'new-password' : undefined)}
            tabIndex={isCalculated ? -1 : undefined}
            error={errorMessage ? true : false}
            step={field.type === 'number' ? 'any' : undefined}
            className={isCalculated ? "bg-base-200/50 border-dashed border-base-300 text-base-content/70 font-semibold cursor-not-allowed focus:border-base-300 focus:ring-0" : ""}
          />
        </FormField>
      );
    }

    case 'textarea':
      if (field.name === 'content') {
        return (
          <Controller
            name={field.name}
            control={control}
            rules={rules}
            defaultValue={field.value || ''}
            render={({ field: { onChange, value } }) => (
              <FormField className={spanClass || 'col-span-2 grid'} label={ensureString(t(field.label))} error={errorMessage} required={field.required}>
                <MarkdownEditor
                  value={value}
                  onChange={onChange}
                  placeholder={ensureString(t(field.placeholder || ''))}
                  disabled={field.disabled}
                  error={!!errorMessage}
                />
              </FormField>
            )}
          />
        );
      }
      return (
        <FormField className={spanClass || 'col-span-2 grid'} label={ensureString(t(field.label))} error={errorMessage} required={field.required}>
          <Textarea
            {...register(field.name, rules)}
            // rows={field.rows}
            placeholder={ensureString(t(field.placeholder || ''))}
            disabled={field.disabled}
            className={errorMessage ? 'textarea-error w-full' : 'w-full'}
          />
        </FormField>
      );

    case 'select':
      return (
        <Controller
          name={field.name}
          control={control}
          rules={rules}
          defaultValue={field.value || ''}
          render={({ field: { onChange, value, ref } }) => (
            <FormField className={spanClass} label={ensureString(t(field.label))} error={errorMessage} required={field.required}>
              <Select
                ref={ref}
                variant='bordered'
                options={(field.options || []).map((opt) => ({ ...opt, label: ensureString(t(opt.label)) }))}
                value={value}
                onChange={onChange}
                disabled={field.disabled}
                error={!!errorMessage}
                placeholder={ensureString(t(field.placeholder || '')) || `Seleccione ${ensureString(t(field.label))}`}
              />
            </FormField>
          )}
        />
      );

    case 'checkbox':
      return (
        <Controller
          name={field.name}
          control={control}
          defaultValue={!!field.value}
          rules={field.required ? { required: t('form.validation_errors.required') } : undefined}
          render={({ field: { onChange, value, ref } }) => (
             <div className={`form-control mb-4 ${spanClass}`}>
                <label className="label cursor-pointer justify-start gap-3">
                  <Checkbox
                    ref={ref}
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={field.disabled}
                    variant={errorMessage ? 'error' : 'primary'}
                  />
                  <span className="label-text font-medium">{ensureString(t(field.label))}</span>
                </label>
                {errorMessage && <span className="text-error text-xs ml-1">{errorMessage}</span>}
             </div>
          )}
        />
      );

    case 'select-requets':
       return (
         <Controller
            name={field.name}
            control={control}
            rules={rules}
            defaultValue={field.value || ''}
            render={({ field: { onChange, value } }) => (
                 <SelectRequest
                   config={field as unknown as SelectRequestProps['config']}
                 value={value} // Pasamos el ID actual
                 onChange={onChange} // RHF recibe el nuevo ID
                 error={errorMessage}
               />
            )}
         />
       );

    default:
      return null;
  }
};
