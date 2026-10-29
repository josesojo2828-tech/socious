import { ArrowDownLeft, ArrowUpRight, CreditCard, History, RefreshCw } from "lucide-react";

export const TransactionIcon = ({ type, status }: { type:any, status:any }) => {
  if (status === 'FAILED') return <div className="p-2 rounded-full bg-base-200 text-base-content/40"><History size={20} /></div>;

  const styles: any = {
    DEPOSIT: 'bg-success/10 text-success',
    REFUND: 'bg-success/10 text-success',
    WITHDRAW: 'bg-base-200 text-base-content/70',
    PAYMENT: 'bg-base-200 text-base-content/70'
  };
  
  const icons: any = {
    DEPOSIT: <ArrowDownLeft size={20} />,
    REFUND: <RefreshCw size={20} />,
    WITHDRAW: <ArrowUpRight size={20} />,
    PAYMENT: <CreditCard size={20} />
  };

  return (
    <div className={`p-2 rounded-full ${styles[type] || 'bg-base-200'}`}>
      {icons[type]}
    </div>
  );
};