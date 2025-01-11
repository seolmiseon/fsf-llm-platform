import Image from 'next/image';
import styles from './HomeBanner.module.css';
import { useState } from 'react';

declare global {
    interface Window {
        kakao: any;
    }
}

export const HomeBanner = () => {
    const [showMap, setShowMap] = useState(false);

    // 지도 초기화 함수
    const initializeMap = (container: HTMLElement) => {
        if (typeof window === 'undefined' || window.kakao) return;

        const map = new window.kakao.maps.Map(container, {
            center: new window.kakao.maps.LatLng(37.5682, 126.8972),
            level: 3,
        });

        const marker = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(37.5682, 126.8972),
            map: map,
        });

        // 마커 추가
        const InfoWindow = new window.kakao.maps.InfoWindow({
            content: `
                    <div style="padding:10px;text-align:center;">
                        <h3 style="margin:0;color:#000;">상암월드컵경기장</h3>
                        <p style="margin:5px 0 0;font-size:12px;color:#666;">
                            서울특별시 마포구 월드컵로 240
                        </p>
                    </div>`,
        });
        InfoWindow.open(map, marker);
    };

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
                    id="map"
                    className={`${styles.mapContainer} ${
                        showMap ? styles.fadeIn : styles.fadeOut
                    }`}
                    ref={(element) => {
                        if (element) initializeMap(element);
                    }}
                />
            )}
        </div>
    );
};
