'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/common/card';
import styles from './TeamCard.module.css';
import { useModalStore } from '@/store/useModalStore';
import { TeamResponse } from '@/types/api/responses';
import { storage } from '@/lib/firebase/config';
import { getDownloadURL, ref } from 'firebase/storage';
import { StarButton } from '@/components/FanPickStar/StarButton';
import { useStarButtonEventStore } from '@/store/useStarButtonEventStore';

interface TeamCardProps {
    team: TeamResponse;
    onClick: () => void;
    competitionId: string;
    onFavoriteClick?: () => void; // 추가된 부분
    isFavorite?: boolean; // 추가된 부분
}

export const TeamCard: React.FC<TeamCardProps> = ({
    team,
    onClick,
    competitionId,
    onFavoriteClick,
    isFavorite,
}) => {
    console.log('🎴 TeamCard rendered', {
        teamId: team.id,
        teamName: team.name,
        hasOnFavoriteClick: !!onFavoriteClick,
        isFavorite
    });

    const { open } = useModalStore();
    const isRecentButtonClick = useStarButtonEventStore((state) => state.isRecentButtonClick);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTeamCrest = async () => {
            if (team.crest) {
                if (!storage) return;
                try {
                    // Firebase Storage의 팀 크레스트 이미지 경로
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

    // StarButton 렌더링 디버깅
    useEffect(() => {
        console.log('🎴 [Card] StarButton 렌더링 체크:', { 
            hasOnFavoriteClick: !!onFavoriteClick, 
            isFavorite,
            willRender: !!(onFavoriteClick && isFavorite !== undefined)
        });
    }, [onFavoriteClick, isFavorite]);

    const handleClick = (e: React.MouseEvent) => {
        // 버튼 클릭인지 먼저 확인 (가장 먼저!)
        const target = e.target as HTMLElement;
        const isStarButton = 
            target.closest('[data-star-button="true"]') !== null ||
            target.tagName === 'BUTTON' || 
            target.closest('button') !== null;
        
        if (isStarButton) {
            console.log('🛑 [Card] 버튼 클릭 감지 - Card 클릭 차단');
            // 버튼 클릭이면 Card 클릭을 차단하지만, 버튼의 이벤트는 실행되도록 함
            return; // stopPropagation 없이 그냥 return
        }

        // 전역 store에서 최근 StarButton 클릭 확인
        if (isRecentButtonClick(100)) {
            console.log('🛑 [Card] Card click prevented - StarButton clicked (전역 store 확인)');
            return;
        }

        console.log('🎴 [Card] Card clicked');
        onClick();
        open('teamDetail', {
            kind: 'team',
            teamId: team.id.toString(),
            competitionId,
        });
    };
    return (
        <Card
            onClick={handleClick}
            className={`
            p-4 rounded-lg bg-white shadow-md cursor-pointer
            ${styles.cardWrapper}
        `}
        >
            <CardContent className="flex flex-col items-center gap-3" style={{ position: 'relative' }}>
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
                {onFavoriteClick && isFavorite !== undefined && (
                    <StarButton
                        isFavorite={isFavorite}
                        onClick={onFavoriteClick}
                    />
                )}
            </CardContent>
        </Card>
    );
};
