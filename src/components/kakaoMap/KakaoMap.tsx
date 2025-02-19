'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { Map, MapMarker } from 'react-kakao-maps-sdk';

export const KakaoMap = () => {
    const [mapLoaded, setMapLoaded] = useState(false);

    useEffect(() => {
        if (window.kakao?.maps) {
            setMapLoaded(true);
        }
    }, []);

    const onLoad = () => {
        setMapLoaded(true);
    };

    return (
        <div className="absolute top-0 left-0 w-full h-full">
            <Script
                strategy="afterInteractive"
                src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}`}
                onLoad={onLoad}
            />

            {mapLoaded && (
                <Map
                    center={{ lat: 37.5666805, lng: 126.9784147 }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <MapMarker
                        position={{ lat: 37.5666805, lng: 126.9784147 }}
                        title="상암월드컵경기장 이랍니다!"
                    />
                </Map>
            )}
        </div>
    );
};
