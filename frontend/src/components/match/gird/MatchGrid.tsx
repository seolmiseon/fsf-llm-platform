import { MatchCard } from '../card/MatchCard';
import { MatchResponse } from '@/types/api/responses';

interface MatchGridProps {
    matches: MatchResponse[];
    className?: string;
}

export const MatchGrid = ({ matches, className = '' }: MatchGridProps) => {
    return (
        <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
        >
            {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
            ))}
        </div>
    );
};
