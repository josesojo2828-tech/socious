'use client';

import { useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Form, FormElement, FormSection } from '@/types/backend/form';
import { Button } from '@/shared/components/atoms/Button';
import { InputRenderer } from './InputRenderer';
import { useTranslation } from '@/context/i18n.context';
import { ensureString } from '@/shared/lib/utils';

interface DynamicFormProps {
  formData: Form;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const DynamicForm = ({ formData, onSubmit, isLoading }: DynamicFormProps) => {

  const { t } = useTranslation();

  // 1. Calcular Default Values
  const defaultValues = useMemo(() => {
    const values: Record<string, any> = {};

    const extractValues = (elements: FormElement[]) => {
      elements.forEach(el => {
        if ('elements' in el) {
          extractValues((el as FormSection).elements);
        } else {
          // Si el input es un checkbox, nos aseguramos de que sea booleano
          if (el.controlType === 'checkbox') {
             values[el.name] = !!el.value;
          } else {
             values[el.name] = el.value ?? '';
          }
        }
      });
    };

    extractValues(formData.inputs);
    return values;
  }, [formData]);

  // 2. Inicializar RHF
  const methods = useForm({
    defaultValues,
    mode: 'onSubmit',
    shouldUnregister: false
  });

  const { watch, setValue } = methods;

  const watchedWeight = watch('weight');
  const watchedHeight = watch('height');
  const watchedGender = watch('patientGender');
  const watchedType = watch('type');

  useEffect(() => {
    if (watchedWeight === undefined || watchedHeight === undefined) return;

    const weight = parseFloat(String(watchedWeight));
    const height = parseFloat(String(watchedHeight));

    if (!isNaN(weight) && !isNaN(height) && height > 0) {
      // 1. Calcular IMC
      const heightInMeters = height / 100;
      const bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));
      setValue('bmi', bmi, { shouldValidate: true, shouldDirty: true });

      // 2. Calcular Peso Ideal (Hamwi)
      let idealWeight = 0;
      const genderStr = String(watchedGender || '').toUpperCase();
      if (genderStr === 'FEMALE' || genderStr === 'FEMENINO' || genderStr === 'MUJER' || genderStr === 'F') {
        idealWeight = parseFloat(((height - 152) * 0.88 + 45.5).toFixed(2));
      } else {
        // Por defecto o MALE
        idealWeight = parseFloat(((height - 152) * 1.08 + 48.5).toFixed(2));
      }
      if (idealWeight < 0) idealWeight = 0;
      setValue('idealWeight', idealWeight, { shouldValidate: true, shouldDirty: true });

      // 3. Calcular Peso Ajustado
      const adjustedWeight = parseFloat((((weight - idealWeight) * 0.25) + idealWeight).toFixed(2));
      setValue('adjustedWeight', adjustedWeight, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedWeight, watchedHeight, watchedGender, setValue]);

  // 3. Renderizado Recursivo (Soporta Secciones y Sub-secciones)
  const renderElement = (element: FormElement) => {
    // Es una Sección (fieldset)
    if ('elements' in element) {
      const section = element as FormSection;
      
      let gridClass = 'grid grid-cols-1 sm:grid-cols-2';
      if (section.gridCols !== undefined) {
        if (section.gridCols === 1) gridClass = 'grid grid-cols-1';
        else if (section.gridCols === 2) gridClass = 'grid grid-cols-1 sm:grid-cols-2';
        else if (section.gridCols === 3) gridClass = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
        else if (section.gridCols === 4) gridClass = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4';
      } else if (section.className) {
        gridClass = section.className;
      }

      return (
        <fieldset className="p-0 mb-6 w-full border-0" key={section.title}>
          {section.title && (
            <legend className="text-base font-bold text-base-content mb-3 px-0 border-b-0">
              {ensureString(t(section.title))}
            </legend>
          )}
          <div className={`gap-4 items-start ${gridClass}`}>
            {section.elements.map(renderElement)}
          </div>
        </fieldset>
      );
    }
    // Es un Input
    // Configurar dinámicamente etiquetas y placeholders según el tipo de meta
    if (['startValue', 'targetValue', 'currentValue'].includes(element.name)) {
      if (watchedType === 'OTHER' || watchedType === 'HABIT') return null;
      const field = { ...element } as any;
      
      if (watchedType === 'HABIT') {
        if (field.name === 'startValue') {
          field.label = 'clinical.goal.start_value_habit';
          field.placeholder = 'Ej: 1 (vez al día/semana)';
        } else if (field.name === 'targetValue') {
          field.label = 'clinical.goal.target_value_habit';
          field.placeholder = 'Ej: 7 (veces por semana)';
        } else if (field.name === 'currentValue') {
          field.label = 'clinical.goal.current_value_habit';
          field.placeholder = 'Progreso actual';
        }
      } else if (watchedType === 'MEASUREMENT') {
        if (field.name === 'startValue') {
          field.label = 'clinical.goal.start_value_measurement';
          field.placeholder = 'Ej: 90';
        } else if (field.name === 'targetValue') {
          field.label = 'clinical.goal.target_value_measurement';
          field.placeholder = 'Ej: 85';
        } else if (field.name === 'currentValue') {
          field.label = 'clinical.goal.current_value_measurement';
          field.placeholder = 'Progreso actual';
        }
      } else if (watchedType === 'WEIGHT') {
        if (field.name === 'startValue') {
          field.label = 'clinical.goal.start_value_weight';
          field.placeholder = 'Ej: 80';
        } else if (field.name === 'targetValue') {
          field.label = 'clinical.goal.target_value_weight';
          field.placeholder = 'Ej: 75';
        } else if (field.name === 'currentValue') {
          field.label = 'clinical.goal.current_value_weight';
          field.placeholder = 'Progreso actual';
        }
      }
      return <InputRenderer key={field.name} field={field} />;
    }
    return <InputRenderer key={element.name} field={element} />;
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="w-full h-full">

         {/* Error Global */}
        {formData.globalError && (
          <div className="alert alert-error mb-6 shadow-md rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{ensureString(formData.globalError)}</span>
          </div>
        )}

        {/* Renderizado Dinámico */}
        <div className="space-y-4">
          {formData.inputs.map(renderElement)}
        </div>

        {/* Botón Submit */}
        <div className="pt-5 mt-6 border-t border-base-200 flex items-center justify-end">
          <Button
            type="submit"
            variant="primary"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl shadow-md shadow-indigo-600/25"
            loading={isLoading}
            loadingText={t('common.actions.saving')}
          >
            {ensureString(formData.submitLabel ? t(formData.submitLabel) : 'Guardar Cambios')}
          </Button>
        </div>

      </form>
    </FormProvider>
  );
};
