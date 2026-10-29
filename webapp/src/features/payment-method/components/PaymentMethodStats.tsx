import { PieChart } from '@/shared/components/molecules/Charts/PieChart';
import { LoadingState } from '@/shared/components/molecules/LoadingState';
import { usePaymentMethodDashboard } from '../hooks/usePayment-methodDashboard';

export const PaymentMethodStats = () => {
  const { stats, loading } = usePaymentMethodDashboard();

  if (loading) return <LoadingState className="h-64" />;
  if (!stats) return null;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-sm text-gray-500 uppercase">Resumen de Payment-method</h2>
        <PieChart config={stats} />
      </div>
    </div>
  );
};
