'use client';

import { MatchResponse } from '@/types/api/responses';
import { Card } from '@/components/ui/common/card';
import { formatMatchTime } from '@/utils/dateFormat';
import Image from 'next/image';
import styles from './MatchCard.module.css';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';
import Link from 'next/link';

interface MatchCardProps {
    match: MatchResponse;
    isActive?: boolean;
}

export function MatchCard({ match, isActive = false }: MatchCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'IN_PLAY':
                return 'bg-green-500';
            case 'PAUSED':
                return 'bg-yellow-500';
            case 'FINISHED':
                return 'bg-gray-500';
            default:
                return 'bg-blue-500';
        }
    };

    const getScore = () => {
        if (match.status === 'SCHEDULED') {
            return 'vs';
        }
        return `${match.score.fullTime.home} : ${match.score.fullTime.away}`;
    };

    return (
        <Link href={`/match/${match.id}`}>
            <Card className={`${styles.card} ${isActive ? styles.active : ''}`}>
                <div className={styles.container}>
                    {/* 경기 상태 배지 */}
                    <div
                        className={`
                      ${styles.statusBadge}
                ${getStatusColor(match.status)}
                `}
                    >
                        {match.status === 'IN_PLAY' ? 'Live' : match.status}
                    </div>

                    {/* 팀 정보와 스코어 */}
                    <div className={styles.teamContainer}>
                        <div className={`${styles.teamInfo} ${styles.right}`}>
                            <div className={styles.logoContainer}>
                                {match.homeTeam.crest ? (
                                    <Image
                                        src={match.homeTeam.crest}
                                        alt={match.homeTeam.name}
                                        fill
                                        className="object-contain"
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                getPlaceholderImageUrl('team');
                                        }}
                                    />
                                ) : (
                                    <div className={styles.placeholderLogo} />
                                )}
                            </div>
                            <p className={styles.teamName}>
                                {match.homeTeam.name}
                            </p>
                        </div>

                        {/* 스코어 */}
                        <div className={styles.scoreSection}>
                            <div className={styles.score}>{getScore()}</div>
                            <div className={styles.matchTime}>
                                {formatMatchTime(match.utcDate, match.status)}
                            </div>
                        </div>

                        {/* 원정팀 */}
                        <div className={`${styles.teamSection} ${styles.away}`}>
                            <div className={styles.logoContainer}>
                                {match.awayTeam.crest ? (
                                    <Image
                                        src={match.awayTeam.crest}
                                        alt={match.awayTeam.name}
                                        fill
                                        className="object-contain"
                                        onError={(e) => {
                                            e.currentTarget.src =
                                                getPlaceholderImageUrl('team');
                                        }}
                                    />
                                ) : (
                                    <div className={styles.placeholderLogo} />
                                )}
                            </div>
                            <p className={styles.teamName}>
                                {match.awayTeam.name}
                            </p>
                        </div>
                    </div>

                    {/* 경기장 정보 */}
                    <div className={styles.venueInfo}>{match.venue}</div>
                </div>
            </Card>
        </Link>
    );
}
