'use client';

import { useState } from 'react';
import { MatchResponse } from '@/types/api/responses';
import { MatchCard } from '../card/MathCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import styles from './MatchCarousel.module.css';

interface MatchCarouselProps {
    matches: MatchResponse[];
    visibleMatches?: number;
}

export function MatchCarousel({
    matches,
    visibleMatches = 3,
}: MatchCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <div className={styles.carouselContainer}>
            <div className="overflow-hidden">
                <div
                    className={styles.carouselTrack}
                    style={{
                        transform: `translateX(-${
                            currentIndex * (100 / visibleMatches)
                        }%)`,
                    }}
                >
                    {matches.map((match, index) => (
                        <div key={match.id} className={styles.carouselItem}>
                            <MatchCard
                                match={match}
                                isActive={index === currentIndex}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {matches.length > visibleMatches && (
                <>
                    <button
                        onClick={() =>
                            setCurrentIndex((prev) => Math.max(prev - 1, 0))
                        }
                        className={clsx(styles.navigationButton, styles.prev)}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() =>
                            setCurrentIndex((prev) =>
                                Math.min(prev + 1, matches.length - 1)
                            )
                        }
                        className={clsx(styles.navigationButton, styles.next)}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}
        </div>
    );
}
