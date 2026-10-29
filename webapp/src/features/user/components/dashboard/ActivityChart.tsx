
const ACTIVITY_DATA = [45, 70, 35, 90, 60, 85, 100];

export const ActivityChart = () => {
    const max = Math.max(...ACTIVITY_DATA);

    return (
        <div className="h-48 w-full flex items-end justify-between gap-2 pt-8 px-2">
            {ACTIVITY_DATA.map((val, i) => (
                <div key={i} className="w-full flex flex-col items-center gap-2 group cursor-pointer">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute mb-36 bg-base-300 text-xs px-2 py-1 rounded">
                        {val} req
                    </div>
                    {/* Bar */}
                    <div
                        className="w-full bg-primary/20 rounded-t-sm relative overflow-hidden group-hover:bg-primary/40 transition-colors"
                        style={{ height: `${(val / max) * 100}%` }}
                    >
                        {/* Animated Fill effect */}
                        <div className="absolute bottom-0 w-full bg-primary h-1"></div>
                    </div>
                    <span className="text-[10px] text-base-content/40 font-mono">D-{7 - i}</span>
                </div>
            ))}
        </div>
    );
};