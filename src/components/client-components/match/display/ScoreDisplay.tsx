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
    const isPending = status === 'SCHEDULED' || status === 'TIMED';

    return (
        <div className="flex flex-col items-center justify-center">
            <div className={`font-bold ${sizeClasses[size]} text-center`}>
                {isPending ? (
                    <span></span>
                ) : (
                    <>
                        {' '}
                        {score.fullTime.home ?? 0} - {score.fullTime.away ?? 0}
                    </>
                )}
            </div>

            {isLive && (
                <div>
                    <span className="animate-pulse bg-red-500 w-2 h-2 rounded-full mr-2" />
                    <span className="text-sm font-medium">
                        {' '}
                        {minute ? `${minute}` : 'LIVE'}{' '}
                    </span>
                </div>
            )}

            {!isPending && score.halfTime && (
                <div className="text-xs text-gray-500 mt-1">
                    HT: {score.halfTime.home ?? 0} - {score.halfTime.away ?? 0}
                </div>
            )}
        </div>
    );
};

export default ScoreDisplay;
