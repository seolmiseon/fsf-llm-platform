'use client';

import { Error } from '@/components/ui/common/error';
import { Empty } from '@/components/ui/common/empty';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import { MatchCarousel } from '../carousel/MatchCarousel';

export function LiveMatches() {
    const { matches, loading, error, refetch } = useLiveMatches();

    if (loading && matches.length === 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, index) => (
                    <div
                        key={index}
                        className="bg-gray-100 animate-pulse rounded-lg h-32"
                    />
                ))}
            </div>
        );
    }

    if (error && matches.length === 0) {
        return (
            <Error message={error} retry={refetch} className="text-center" />
        );
    }

    if (!matches.length) {
        return <Empty message="No live matches at the moment" />;
    }

    return <MatchCarousel matches={matches} visibleMatches={3} />;
}
