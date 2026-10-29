import { PieChart } from '@/shared/components/molecules/Charts/PieChart';
import { LoadingState } from '@/shared/components/molecules/LoadingState';
import { useSubscriptionDashboard } from '../hooks/useSubscriptionDashboard';

export const SubscriptionStats = () => {
  const { stats, loading } = useSubscriptionDashboard();

  if (loading) return <LoadingState className="h-64" />;
  if (!stats) return null;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-sm text-gray-500 dark:text-slate-400 uppercase">Resumen de Subscription</h2>
        <PieChart config={stats} />
      </div>
    </div>
  );
};
