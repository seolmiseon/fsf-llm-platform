'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './LeagueCard.module.css';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';

export function KLeagueCards() {
    const router = useRouter();

    const kLeagues = [
        {
            name: 'K LEAGUE',
            division: '1부리그',
            country: '대한민국',
        },
        {
            name: 'K LEAGUE',
            division: '2부리그',
            country: '대한민국',
        },
    ];

    const handleKLeagueClick = () => {
        router.push('/stats');
    };

    return (
        <>
            {kLeagues.map((league) => (
                <div
                    key={league.division}
                    className={styles.card}
                    onClick={handleKLeagueClick}
                    style={{ cursor: 'pointer', height: '100%' }}
                >
                    <div className={styles.logoContainer}>
                        <Image
                            src="/images/KLeague.png"
                            alt={`K League ${league.division}`}
                            width={96}
                            height={96}
                            className={styles.logo}
                            priority
                            onError={(e) => {
                                e.currentTarget.src =
                                    getPlaceholderImageUrl('league');
                            }}
                        />
                    </div>
                    <h3 className={styles.leagueName}>{league.name}</h3>
                    <p className={styles.countryName}>{league.division}</p>
                </div>
            ))}
        </>
    );
}
