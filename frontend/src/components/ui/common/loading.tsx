interface LoadingProps {
    type?: 'default' | 'cards';
    count?: number;
}

export const Loading = ({ type = 'default', count = 6 }: LoadingProps) => {
    if (type === 'cards') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {Array.from({ length: count }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-lg border bg-card shadow-sm p-4 animate-pulse"
                    >
                        <div className="h-32 bg-gray-200 rounded-full w-32 mx-auto mb-4" />
                        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-gray-600">Loading...</div>
        </div>
    );
};
