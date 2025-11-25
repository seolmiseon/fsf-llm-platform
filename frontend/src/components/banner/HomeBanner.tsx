'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flame, Zap, TrendingUp, Trophy, Sparkles } from 'lucide-react';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import styles from './HomeBanner.module.css';

interface BannerCard {
    id: number;
    type: 'bigMatch' | 'liveScore' | 'trending' | 'topScorer' | 'aiPick';
    title: string;
    subtitle: string;
    icon: any;
    gradient: string;
    content?: React.ReactNode;
}

export const HomeBanner = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { matches } = useLiveMatches();

    // 5초마다 자동 슬라이드
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % 5);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const cards: BannerCard[] = [
        {
            id: 1,
            type: 'bigMatch',
            title: "Today's Big Match",
            subtitle: matches[0] ? `${matches[0].homeTeam.name} vs ${matches[0].awayTeam.name}` : 'Loading...',
            icon: Flame,
            gradient: 'from-red-600 to-orange-600',
        },
        {
            id: 2,
            type: 'liveScore',
            title: 'Live Scores',
            subtitle: `${matches.length} matches in progress`,
            icon: Zap,
            gradient: 'from-purple-600 to-indigo-600',
        },
        {
            id: 3,
            type: 'trending',
            title: 'League Standings',
            subtitle: 'Weekly ranking updates',
            icon: TrendingUp,
            gradient: 'from-blue-600 to-cyan-600',
        },
        {
            id: 4,
            type: 'topScorer',
            title: 'Top Scorers',
            subtitle: 'This season leaders',
            icon: Trophy,
            gradient: 'from-yellow-600 to-amber-600',
        },
        {
            id: 5,
            type: 'aiPick',
            title: 'AI Picks',
            subtitle: 'Recommended matches',
            icon: Sparkles,
            gradient: 'from-pink-600 to-rose-600',
        },
    ];

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % cards.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    };

    return (
        <div className={styles.carouselContainer}>
            <div className={styles.carousel}>
                {cards.map((card, index) => {
                    const Icon = card.icon;
                    const offset = index - currentIndex;
                    const isActive = index === currentIndex;

                    return (
                        <div
                            key={card.id}
                            className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                            style={{
                                transform: `translateX(${offset * 110}%) scale(${isActive ? 1 : 0.85})`,
                                opacity: Math.abs(offset) > 1 ? 0 : isActive ? 1 : 0.5,
                                zIndex: isActive ? 10 : 5 - Math.abs(offset),
                            }}
                        >
                            <div className={`${styles.cardInner} bg-gradient-to-br ${card.gradient}`}>
                                <div className={styles.cardIcon}>
                                    <Icon className="w-12 h-12 text-white" />
                                </div>
                                <h2 className={styles.cardTitle}>{card.title}</h2>
                                <p className={styles.cardSubtitle}>{card.subtitle}</p>

                                {isActive && (
                                    <div className={styles.cardDetail}>
                                        {card.type === 'liveScore' && matches.slice(0, 3).map((match, idx) => (
                                            <div key={idx} className={styles.scoreItem}>
                                                <span className="text-sm">{match.homeTeam.shortName}</span>
                                                <span className="font-bold mx-2">{match.score?.fullTime?.home ?? '-'} : {match.score?.fullTime?.away ?? '-'}</span>
                                                <span className="text-sm">{match.awayTeam.shortName}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Navigation Buttons */}
            <button
                onClick={prevSlide}
                className={`${styles.navButton} ${styles.navButtonLeft}`}
                aria-label="Previous slide"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button
                onClick={nextSlide}
                className={`${styles.navButton} ${styles.navButtonRight}`}
                aria-label="Next slide"
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            {/* Indicators */}
            <div className={styles.indicators}>
                {cards.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`${styles.indicator} ${index === currentIndex ? styles.indicatorActive : ''}`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
