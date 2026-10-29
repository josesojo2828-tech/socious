import { Skeleton } from "../../atoms/Skeleton";
import { Spinner } from "../../atoms/Spinner";

export const FormSkeleton = () => (
    <div className="grid grid-cols-2 gap-3 relative">
        <div className="absolute top-0 left-0 h-full w-full flex justify-center items-center">
            <Spinner variant="bars" size="lg" />
        </div>
        <Skeleton variant="input" className="bg-base-200" />
        <Skeleton variant="input" className="bg-base-200" />
        <Skeleton variant="input" className="bg-base-200 col-span-2" />
        <Skeleton variant="input" className="bg-base-200" />
        <Skeleton variant="input" className="bg-base-200" />
        <Skeleton variant="input" className="bg-base-200" />
        <Skeleton variant="input" className="bg-base-200" />
        <Skeleton variant="input" className="bg-base-200 col-span-2" />
    </div>
)