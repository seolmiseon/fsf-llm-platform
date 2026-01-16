'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { MatchResponse } from '@/types/api/responses';
import { MatchCard } from '../card/MatchCard';
import styles from './MatchCarousel.module.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface MatchCarouselProps {
    matches: MatchResponse[];
    visibleMatches?: number;
}

export function MatchCarousel({
    matches,
    visibleMatches = 3,
}: MatchCarouselProps) {
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
