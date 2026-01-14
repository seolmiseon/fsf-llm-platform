'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/common/card';
import { StarButton } from '@/components/FanPickStar/StarButton';
import styles from './TeamCard.module.css';
import { useModalStore } from '@/store/useModalStore';
import { TeamResponse } from '@/types/api/responses';
import { storage } from '@/lib/firebase/config';
import { getDownloadURL, ref } from 'firebase/storage';

interface TeamCardProps {
    team: TeamResponse;
    onClick: () => void;
    competitionId: string;
    onFavoriteClick?: () => void;
    isFavorite?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({
    team,
    onClick,
    competitionId,
    onFavoriteClick,
    isFavorite,
}) => {
    const { open } = useModalStore();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTeamCrest = async () => {
            if (team.crest) {
                if (!storage) return;
                try {
                    const crestRef = ref(storage, `teams/${team.id}/crest.png`);
                    const url = await getDownloadURL(crestRef);
                    setImageUrl(url);
                } catch (error) {
                    console.error('Error loading team crest:', error);
                    setImageUrl(null);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        loadTeamCrest();
    }, [team.id, team.crest]);

    const handleCardClick = () => {
        console.log('🟥 [DEBUG] 카드 본문 영역 클릭됨');
        onClick();
        open('teamDetail', {
            kind: 'team',
            teamId: team.id.toString(),
            competitionId,
        });
    };

    return (
        <Card 
            className={`p-4 rounded-lg bg-white shadow-md ${styles.cardWrapper}`}
            // 전체 캡쳐링 로그: 어디를 누르든 여기서 먼저 감지합니다.
            onClickCapture={(e) => {
                console.log('🕵️ [DEBUG] Click Capture:', (e.target as HTMLElement).tagName, (e.target as HTMLElement).className);
            }}
        >
            <CardContent className="flex flex-col items-center gap-3" style={{ position: 'relative' }}>
                
                {/* 🟥 본문 영역 (빨간 테두리) */}
                <div 
                    onClick={handleCardClick}
                    className="w-full flex flex-col items-center gap-3 cursor-pointer"
                    style={{ border: '2px solid red', padding: '5px' }} // 디버깅용 테두리
                >
                    {/* 🟦 이미지 영역 (파란 테두리) */}
                    <div 
                        className={styles.badgeContainer} 
                        style={{ border: '2px solid blue', position: 'relative', overflow: 'hidden' }}
                    >
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center">...</div>
                        ) : imageUrl ? (
                            <Image
                                src={imageUrl}
                                alt={`${team.name} badge`}
                                width={80}
                                height={80}
                                className={styles.teamBadge}
                                priority
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                                <span>{team.name.slice(0, 2)}</span>
                            </div>
                        )}
                    </div>

                    <div className={`text-center ${styles.teamInfo}`}>
                        <h3 className="text-lg font-semibold">{team.name}</h3>
                    </div>
                </div>

                {/* 🟩 버튼 영역 (초록 테두리) */}
                {onFavoriteClick && isFavorite !== undefined && (
                    <div style={{ border: '2px solid green', width: '100%', position: 'relative', zIndex: 99999 }}>
                        <StarButton
                            isFavorite={isFavorite}
                            onClick={() => {
                                console.log('🟢 [DEBUG] 버튼 클릭 핸들러 진입!');
                                onFavoriteClick();
                            }}
                            className="w-full relative pointer-events-auto"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
};