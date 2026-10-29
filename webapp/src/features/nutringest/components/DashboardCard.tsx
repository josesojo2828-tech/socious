
export function DashboardCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`bg-base-100 rounded-xl border border-base-300 shadow-sm ${className}`}>
            {children}
        </div>
    )
};