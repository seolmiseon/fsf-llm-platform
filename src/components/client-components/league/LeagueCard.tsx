'use client';

import Link from 'next/link';
import styles from './LeagueCard.module.css';

interface LeagueCardProps {
    id: string;
    name: string;
    country: string;
    gradientFrom: string;
    gradientTo: string;
}

export function LeagueCard({
    id,
    name,
    country,
    gradientFrom,
    gradientTo,
}: LeagueCardProps) {
    return (
        <Link href={`/league/${id}`} className={styles.card}>
            <div className={styles.logoContainer}>
                <div
                    className={`w-28 h-28 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-lg flex items-center justify-center`}
                >
                    <span className="text-2xl font-bold text-white">
                        {name.slice(0, 2)}
                    </span>
                </div>
            </div>
            <h3 className={styles.leagueName}>{name}</h3>
            <p className={styles.countryName}>{country}</p>
        </Link>
    );
}
