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
                
                {/* 1. 본문 영역 (클릭 시 상세 모달) */}
                <div 
                    onClick={handleCardClick}
                    className="w-full flex flex-col items-center gap-3 cursor-pointer"
                >
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

                {/* 2. 버튼 영역 (클릭 시 즐겨찾기) */}
                {/* z-10과 relative는 혹시 모를 상황을 대비해 안전하게 남겨둡니다 */}
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