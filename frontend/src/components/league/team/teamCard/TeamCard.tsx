'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/common/card';
import styles from './TeamCard.module.css';
import { useModalStore } from '@/store/useModalStore';
import { TeamResponse } from '@/types/api/responses';
import { storage } from '@/lib/firebase/config';
import { getDownloadURL, ref } from 'firebase/storage';

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
        // 버튼 자체 또는 버튼 내부 요소 클릭 시 이벤트 전파 중단
        if (target.tagName === 'BUTTON' || target.closest('button')) {
            console.log('🛑 Card click prevented - button clicked');
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
    return (
        <Card
            onClick={handleClick}
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
                    <button
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            console.log('🔘 Button clicked in TeamCard!', { teamId: team.id, isFavorite });
                            // 이벤트 전파 완전 차단
                            e.stopPropagation();
                            e.preventDefault();
                            // 이벤트 버블링 방지를 위한 추가 처리
                            if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                            }
                            onFavoriteClick();
                        }}
                        onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
                            // 마우스 다운 이벤트도 전파 차단
                            e.stopPropagation();
                        }}
                        className={`mt-2 px-4 py-2 rounded-lg transition-colors ${
                            isFavorite
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        style={{ 
                            zIndex: 100, 
                            position: 'relative',
                            pointerEvents: 'auto' // 포인터 이벤트 명시적 설정
                        }}
                    >
                        {isFavorite
                            ? '❤️ Remove from Favorites'
                            : '⭐ Add to Favorites'}
                    </button>
                )}
            </CardContent>
        </Card>
    );
};
