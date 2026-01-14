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

    // 디버깅: props 확인
    useEffect(() => {
        console.log('🎴 [TeamCard] 렌더링됨', {
            teamId: team.id,
            teamName: team.name,
            hasOnFavoriteClick: !!onFavoriteClick,
            isFavorite,
            buttonWillRender: !!(onFavoriteClick && isFavorite !== undefined)
        });
    }, [team.id, team.name, onFavoriteClick, isFavorite]);

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
        onClick();
        open('teamDetail', {
            kind: 'team',
            teamId: team.id.toString(),
            competitionId,
        });
    };

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('⭐ [TeamCard] 즐겨찾기 버튼 클릭됨', { teamId: team.id, isFavorite });
        onFavoriteClick?.();
    };

    return (
        <Card
            onClick={handleCardClick}
            className={`p-4 rounded-lg bg-white shadow-md cursor-pointer ${styles.cardWrapper}`}
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
                {/* 디버깅: 버튼 렌더링 조건 확인 */}
                {(() => {
                    console.log('🔘 [TeamCard] 버튼 렌더링 체크:', {
                        onFavoriteClick: !!onFavoriteClick,
                        isFavorite,
                        condition: onFavoriteClick && isFavorite !== undefined
                    });
                    return null;
                })()}
                {onFavoriteClick && isFavorite !== undefined ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            console.log('🔘🔘🔘 [TeamCard] 버튼 onClick 직접 실행됨! 🔘🔘🔘');
                            e.stopPropagation();
                            onFavoriteClick();
                        }}
                        onMouseDown={(e) => {
                            console.log('🔘 [TeamCard] 버튼 onMouseDown!');
                            e.stopPropagation();
                        }}
                        className={`mt-2 px-4 py-2 rounded-lg transition-colors ${
                            isFavorite
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        style={{ position: 'relative', zIndex: 100 }}
                    >
                        {isFavorite ? '❤️ Remove from Favorites' : '⭐ Add to Favorites'}
                    </button>
                ) : (
                    <div style={{ color: 'red', fontSize: '10px' }}>
                        버튼 미렌더링: onFavoriteClick={String(!!onFavoriteClick)}, isFavorite={String(isFavorite)}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
