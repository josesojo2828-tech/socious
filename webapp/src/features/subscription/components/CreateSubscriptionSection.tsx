import { useDynamicForm } from '@/shared/hooks/useDynamicForm';
import { DynamicForm } from '@/shared/components/organisms/DynamicForm/DynamicForm';
import { LoadingState } from '@/shared/components/molecules/LoadingState';
import { SubscriptionPlanEndpoints } from '../services/subscription.endpoints';

export const CreateSubscriptionSection = () => {
  const { formStructure, submitForm, isLoading, isSubmitting } = useDynamicForm({
    endpoint: SubscriptionPlanEndpoints.form.create,
    onSuccessRedirect: '/subscription'
  });

  if (isLoading) return <LoadingState text="Cargando formulario..." />;
  if (!formStructure) return <div className="alert alert-error">Error cargando formulario. Revisa la conexión a la API.</div>;

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
           <h2 className="card-title">{formStructure.title}</h2>
           <div className="badge badge-primary badge-outline">Nuevo</div>
        </div>
        <div className="divider m-0"></div>
        <DynamicForm 
            formData={formStructure} 
            onSubmit={submitForm} 
            isLoading={isSubmitting} 
        />
      </div>
    </div>
  );
};
