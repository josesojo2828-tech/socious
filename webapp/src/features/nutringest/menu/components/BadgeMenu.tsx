import { BadgeColor, BadgeProps } from "../types/menu.details";

export const BadgeMenu: React.FC<BadgeProps> = ({ children, color = "purple", className = "" }) => {
    const colors: Record<BadgeColor, string> = {
        purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        blue: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        green: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
        gray: "bg-base-200 text-base-content/70 border-base-300",
        orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${colors[color]} ${className}`}>
            {children}
        </span>
    );
};
