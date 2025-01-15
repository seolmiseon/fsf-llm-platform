// 'use client';

// import { useEffect, useRef } from 'react';

// declare global {
//     interface Window {
//         kakao: any;
//     }
// }

// interface KakaoMapProps {
//     className?: string;
// }

// export const KakaoMap = ({ className }: KakaoMapProps) => {
//     const mapRef = useRef<HTMLDivElement>(null);

//     useEffect(() => {
//         const loadKakaoMap = () => {
//             if (
//                 typeof window === 'undefined' ||
//                 !window.kakao?.maps ||
//                 !mapRef.current
//             )
//                 return;

//             const map = new window.kakao.maps.Map(mapRef.current, {
//                 center: new window.kakao.maps.LatLng(37.5682, 126.8972),
//                 level: 3,
//             });

//             const marker = new window.kakao.maps.Marker({
//                 position: new window.kakao.maps.LatLng(37.5682, 126.8972),
//                 map: map,
//             });

//             const InfoWindow = new window.kakao.maps.InfoWindow({
//                 content: `
//                     <div style="padding:10px;text-align:center;">
//                         <h3 style="margin:0;color:#000;">상암월드컵경기장</h3>
//                         <p style="margin:5px 0 0;font-size:12px;color:#666;">
//                             서울특별시 마포구 월드컵로 240
//                         </p>
//                     </div>`,
//             });
//             InfoWindow.open(map, marker);
//         };

//         loadKakaoMap();
//     }, []);

//     return (
//         <div
//             ref={mapRef}
//             className={className}
//             style={{ width: '100%', height: '100%' }}
//         />
//     );
// };
