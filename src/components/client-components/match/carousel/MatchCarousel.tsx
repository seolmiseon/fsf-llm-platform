'use client';

import { useState } from 'react';
import { MatchResponse } from '@/types/api/responses';
import { MatchCard } from './MathCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MatchCarouselProps {
    matches: MatchResponse[];
}

export function MatchCarousel({ matches }: MatchCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <div>
            <button
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            >
                <ChevronLeft />
            </button>

            <div className="overflow-hidden">
                <div className="flex transition-transform">
                    {matches.map((match, index) => (
                        <MatchCard
                            key={match.id}
                            match={match}
                            isActive={index === currentIndex}
                        />
                    ))}
                </div>
            </div>

            <button
                onClick={() =>
                    setCurrentIndex((prev) =>
                        Math.min(prev + 1, matches.length - 1)
                    )
                }
                className="absolute right-0 z-10"
            >
                <ChevronRight />
            </button>
        </div>
    );
}
