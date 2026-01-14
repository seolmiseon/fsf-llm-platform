'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/common/card';
import { StarButton } from '@/components/FanPickStar/StarButton'; // 👈 경로 확인 필요
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

    // 디버깅: props 확인 (유지)
    useEffect(() => {
        // 불필요한 리렌더링 로그를 줄이기 위해 로딩 완료 시에만 찍히도록 하거나 유지
        if (!loading) {
             console.log('🎴 [TeamCard] Ready:', { teamName: team.name, isFavorite });
        }
    }, [team.name, isFavorite, loading]);

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
        console.log('🃏 카드 본문 클릭됨 -> 상세 모달 오픈');
        onClick();
        open('teamDetail', {
            kind: 'team',
            teamId: team.id.toString(),
            competitionId,
        });
    };

    return (
        <Card
            // ❌ 제거됨: onClick={handleCardClick} 
            // 이유: 여기서 onClick을 잡으면 자식 버튼 클릭까지 먹어버릴 수 있음
            className={`p-4 rounded-lg bg-white shadow-md ${styles.cardWrapper}`}
        >
            <CardContent className="flex flex-col items-center gap-3">
                
                {/* ✅ 1. 클릭 가능한 본문 영역 (버튼 제외) */}
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

                {/* ✅ 2. 독립된 버튼 영역 (본문 div와 형제 관계) */}
                {onFavoriteClick && isFavorite !== undefined && (
                    <StarButton
                        isFavorite={isFavorite}
                        onClick={onFavoriteClick}
                        className="w-full z-10" // z-index 명시
                    />
                )}
            </CardContent>
        </Card>
    );
};