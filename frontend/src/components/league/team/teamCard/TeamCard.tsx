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

    // 이미지 로딩 로직
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
        // console.log('🃏 카드 본문 클릭'); // 필요시 주석 해제
        onClick();
        open('teamDetail', {
            kind: 'team',
            teamId: team.id.toString(),
            competitionId,
        });
    };

    return (
        <Card className={`p-4 rounded-lg bg-white shadow-md ${styles.cardWrapper}`}>
            <CardContent className="flex flex-col items-center gap-3">
                
                {/* ✅ [핵심 1] 클릭 영역 분리
                  Card 자체의 onClick을 제거하고, 버튼을 제외한 '카드 내용'만 div로 감싸서 클릭 이벤트를 줍니다.
                  이렇게 하면 버튼 클릭 시 Card의 onClick이 발동될 염려가 0%가 됩니다.
                */}
                <div 
                    onClick={handleCardClick}
                    className="w-full flex flex-col items-center gap-3 cursor-pointer"
                >
                    {/* ✅ [핵심 2] CSS 수정 확인 완료 
                      badgeContainer에 relative + overflow:hidden이 적용되어
                      이미지 영역이 버튼을 덮는 현상이 해결되었습니다.
                    */}
                    <div className={styles.badgeContainer}>
                        {loading ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                            </div>
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
                                <span className="text-xl font-bold text-white">
                                    {team.name.slice(0, 2)}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className={`text-center ${styles.teamInfo}`}>
                        <h3 className="text-lg font-semibold">{team.name}</h3>
                        <p className="text-sm text-gray-600">{team.tla}</p>
                    </div>
                </div>

                {/* ✅ [핵심 3] 버튼 독립 배치 및 안전장치
                  StarButton을 위 div 밖으로 꺼내 형제 요소로 만들었습니다.
                  z-10과 relative를 추가하여 CSS 이슈가 재발해도 버튼이 위에 뜨도록 강제했습니다.
                */}
                {onFavoriteClick && isFavorite !== undefined && (
                    <StarButton
                        isFavorite={isFavorite}
                        onClick={onFavoriteClick}
                        className="w-full relative z-10 pointer-events-auto"
                    />
                )}
            </CardContent>
        </Card>
    );
};