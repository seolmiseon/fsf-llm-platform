// components/ui/common/empty.tsx
export const Empty = ({
    message,
    className = '',
}: {
    message: string;
    className?: string;
}) => (
    <div
        className={`flex items-center justify-center min-h-[200px] ${className}`}
    >
        <div className="text-gray-500">{message}</div>
    </div>
);
