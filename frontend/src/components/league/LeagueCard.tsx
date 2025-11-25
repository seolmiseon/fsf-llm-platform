'use client';

import Link from 'next/link';
import styles from './LeagueCard.module.css';
import Image from 'next/image';
import type { Competition } from '@/types/api/responses';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';

interface LeagueCardProps {
    competition: Competition;
}

// 리그별 브랜드 컬러 매핑 (무료 API에서 제공되는 리그만)
const leagueColors: Record<string, string> = {
    'Premier League': 'from-purple-600 to-pink-600',
    'La Liga': 'from-red-600 to-orange-600',
    'Bundesliga': 'from-red-700 to-black',
    'Serie A': 'from-blue-600 to-green-600',
    'Ligue 1': 'from-blue-700 to-blue-900',
    'Primeira Liga': 'from-green-600 to-green-800',
    'Eredivisie': 'from-orange-500 to-red-600',
    'Championship': 'from-yellow-600 to-orange-700',
    'FIFA World Cup': 'from-yellow-400 to-blue-600',
    'UEFA Champions League': 'from-blue-800 to-purple-900',
    'UEFA Europa League': 'from-orange-500 to-yellow-500',
};

export function LeagueCard({ competition }: LeagueCardProps) {
    const gradientColor = leagueColors[competition.name] || 'from-gray-600 to-gray-800';

    return (
        <Link href={`/league/${competition.id}`} className={styles.card}>
            {/* 리그별 컬러 헤더 추가 */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientColor}`} />

            <div className={styles.logoContainer}>
                {competition.emblem ? (
                    <Image
                        src={competition.emblem}
                        alt={`${competition.name} emblem`}
                        width={96}
                        height={96}
                        className={styles.logo}
                        onError={(e) => {
                            e.currentTarget.src =
                                getPlaceholderImageUrl('league');
                        }}
                    />
                ) : (
                    <div
                        className={`w-28 h-28 bg-gradient-to-br ${gradientColor} rounded-lg flex items-center justify-center`}
                    >
                        <span className="text-2xl font-bold text-white">
                            {competition.name.slice(0, 2)}
                        </span>
                    </div>
                )}
            </div>
            <h3 className={styles.leagueName}>{competition.name}</h3>
            <p className={styles.countryName}>{competition.area.name}</p>
        </Link>
    );
}
