import { Score } from '@/types/api/responses';

interface ScoreDisplayProps {
    score: Score;
    status: string;
    minute?: number;
    size?: 'sm' | 'md' | 'lg';
}

export const ScoreDisplay = ({
    score,
    status,
    minute,
    size = 'md',
}: ScoreDisplayProps) => {
    const sizeClasses = {
        sm: 'text-xl',
        md: 'text-3xl',
        lg: 'text-5xl',
    };

    const isLive = status === 'IN_PLAY' || status === 'PAUSED';

    return (
        <div className="flex flex-col items-center justify-center min-w-[100px]">
            <div
                className={`font-bold ${sizeClasses[size]} text-center flex items-center gap-8`}
            >
                <span className="min-w-[40px] text-right">
                    {score.fullTime.home ?? 0}
                </span>
                <span className="text-gray-500">:</span>
                <span className="min-w-[40px] text-left">
                    {' '}
                    {score.fullTime.away ?? 0}
                </span>
            </div>

            {isLive && (
                <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="animate-pulse bg-red-500 w-2 h-2 rounded-full " />
                    <span className="text-sm font-medium">
                        {' '}
                        {minute ? `${minute}` : 'LIVE'}{' '}
                    </span>
                </div>
            )}
        </div>
    );
};

export default ScoreDisplay;
