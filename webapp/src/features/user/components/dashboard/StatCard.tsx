import { FC } from "react";

interface StatCardProps {
    title: string;
    value: any;
    subtext: string;
    icon: any;
    trend: any
}

export const StatCard: FC<StatCardProps> = ({ title, value, subtext, icon, trend }) => (
  <div className="card bg-base-100 rounded-2xl p-6 shadow-sm border border-base-300 transition-shadow text-base-content">
    <div className="card-body p-5 flex flex-row items-start justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-base-content">{value}</h3>
        {subtext && <p className="text-xs text-base-content/60 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-success/10 text-success' : trend === 'down' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
        {icon}
      </div>
    </div>
  </div>
);

