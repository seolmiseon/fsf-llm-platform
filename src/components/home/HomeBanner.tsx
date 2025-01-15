'use client';

import Image from 'next/image';
import styles from './HomeBanner.module.css';
import { useState } from 'react';
import { KakaoMap } from '@/components/ui/maps/KakaoMap';

export const HomeBanner = () => {
    const [showMap, setShowMap] = useState(false);

    return (
        <div
            className={`${styles.bannerContainer} relative h-96 overflow-hidden`}
            onMouseEnter={() => setShowMap(true)}
            onMouseLeave={() => setShowMap(false)}
        >
            <div
                className={`${styles.content} ${
                    showMap ? styles.fadeOut : styles.fadeIn
                }`}
            >
                <Image
                    src="/images/stadium.png"
                    alt="Stadium background"
                    fill
                    priority
                    className={styles.bannerImage}
                />

                <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
                    <h1 className="text-5xl font-bold">Full of Soccer Fun</h1>
                    <p className="text-xl mt-4">Your Gateway to Football Joy</p>
                </div>
            </div>

            {showMap && (
                <div
                    className={`${styles.mapContainer} ${
                        showMap ? styles.fadeIn : styles.fadeOut
                    }`}
                >
                    <KakaoMap className="w-full h-full" />
                </div>
            )}
        </div>
    );
};
