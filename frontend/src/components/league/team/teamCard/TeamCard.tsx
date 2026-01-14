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

    const handleClick = (e: React.MouseEvent) => {
        // 버튼 클릭일 경우 Card 클릭 방지
        const target = e.target as HTMLElement;
        
        // StarButton 식별: data-star-button 속성 또는 버튼 요소 확인
        const isStarButton = 
            target.closest('[data-star-button="true"]') !== null ||
            target.tagName === 'BUTTON' || 
            target.closest('button') !== null;
        
        if (isStarButton) {
            console.log('🛑 Card click prevented - StarButton clicked');
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        console.log('🎴 Card clicked');
        onClick();
        open('teamDetail', {
            kind: 'team',
            teamId: team.id.toString(),
            competitionId,
        });
    };

    // 캡처 단계에서도 버튼 클릭 감지 (하지만 전파는 차단하지 않음)
    // 전파를 차단하면 버튼의 onClick이 실행되지 않음
    const handleClickCapture = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isStarButton = target.closest('[data-star-button="true"]') !== null;
        
        if (isStarButton) {
            console.log('🛑 [Card] 캡처 단계에서 StarButton 감지됨 (버튼 onClick 실행을 위해 전파는 차단하지 않음)');
            // 주의: 여기서 stopPropagation을 하면 버튼의 onClick이 실행되지 않음!
        }
    };
    return (
        <Card
            onClick={handleClick}
            onClickCapture={handleClickCapture}
            className={`
            p-4 rounded-lg bg-white shadow-md cursor-pointer
            ${styles.cardWrapper}
        `}
        >
            <CardContent className="flex flex-col items-center gap-3">
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
