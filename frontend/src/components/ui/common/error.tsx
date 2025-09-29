export const Error = ({
    message,
    retry,
    className = '',
}: {
    message?: string;
    retry?: () => void;
    className?: string;
}) => (
    <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p>{message}</p>
            {retry && (
                <button
                    onClick={retry}
                    className="mt-2 text-sm underline hover:text-red-800"
                >
                    Try again
                </button>
            )}
        </div>
    </div>
);
