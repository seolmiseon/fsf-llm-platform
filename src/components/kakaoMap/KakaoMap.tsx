import { Map, MapMarker } from 'react-kakao-maps-sdk';

export const KakaoMap = () => (
    <Map
        center={{ lat: 37.5666805, lng: 126.9784147 }}
        style={{ width: '100%', height: '100%' }}
    >
        <MapMarker
            position={{ lat: 37.5666805, lng: 126.9784147 }}
            title="상암월드컵경기장 이랍니다!"
        />
    </Map>
);
