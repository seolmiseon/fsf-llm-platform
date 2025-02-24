'use client';

import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { MatchResponse } from '@/types/api/responses';
import { MatchCard } from '../card/MatchCard'; // 기존 MatchCard 사용
import styles from './MatchCarousel.module.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { FootballDataApi } from '@/lib/client/api/football-data';

interface MatchCarouselProps {
    matches: MatchResponse[];
    visibleMatches?: number;
}

export function MatchCarousel({
    matches: initialMatches,
    visibleMatches = 3,
}: MatchCarouselProps) {
    const [matches, setMatches] = useState<MatchResponse[]>(
        initialMatches || []
    );
    const [loading, setLoading] = useState(!initialMatches);

    useEffect(() => {
        // initialMatches가 있으면 fetch 하지 않음
        if (initialMatches) return;

        const fetchLiveMatches = async () => {
            try {
                const api = new FootballDataApi();
                const result = await api.getLiveMatches();
                if (result.success) {
                    setMatches(result.data);
                }
            } catch (error) {
                console.error('Failed to fetch live matches:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLiveMatches();
        const interval = setInterval(fetchLiveMatches, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [initialMatches]);

    if (loading) {
        return (
            <div className="h-48 flex items-center justify-center">
                Loading...
            </div>
        );
    }

    if (!matches.length) {
        return (
            <div className="text-center py-8">
                <h2 className="text-2xl font-bold mb-4">Live Matches</h2>
                <p className="text-gray-600">No live matches at the moment</p>
            </div>
        );
    }

    return (
        <div className={`my-8 ${styles.carousel}`}>
            <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={30}
                slidesPerView={3}
                navigation
                pagination={false}
                autoplay={{ delay: 3000, disableOnInteraction: false }}
                breakpoints={{
                    640: { slidesPerView: Math.min(2, visibleMatches) },
                    1024: { slidesPerView: Math.min(3, visibleMatches) },
                }}
                className="h-48"
            >
                {matches.map((match) => (
                    <SwiperSlide key={match.id}>
                        <div className="flex justify-center">
                            <MatchCard match={match} />
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}
