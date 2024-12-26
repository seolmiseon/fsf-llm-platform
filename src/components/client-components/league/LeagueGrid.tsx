'use client';

import { LeagueCard } from './LeagueCard';

const LEAGUES = [
    {
        id: 'premier-league',
        name: 'PREMIER LEAGUE',
        country: 'England',
        gradientFrom: 'from-purple-600',
        gradientTo: 'to-blue-500',
    },
    {
        id: 'la-liga',
        name: 'LA LIGA',
        country: 'Spain',
        gradientFrom: 'from-red-600',
        gradientTo: 'to-yellow-500',
    },
    {
        id: 'bundesliga',
        name: 'BUNDESLIGA',
        country: 'Germany',
        gradientFrom: 'from-red-500',
        gradientTo: 'to-black',
    },
    {
        id: 'serie-a',
        name: 'SERIE A',
        country: 'Italy',
        gradientFrom: 'from-blue-600',
        gradientTo: 'to-green-500',
    },
    {
        id: 'champions-league',
        name: 'CHAMPIONS LEAGUE',
        country: 'Europe',
        gradientFrom: 'from-blue-500',
        gradientTo: 'to-indigo-700',
    },
    {
        id: 'ligue-1',
        name: 'LIGUE 1',
        country: 'France',
        gradientFrom: 'from-blue-600',
        gradientTo: 'to-red-500',
    },
    {
        id: 'k-league-1',
        name: 'K LEAGUE 1',
        country: 'South Korea',
        gradientFrom: 'from-orange-500',
        gradientTo: 'to-red-600',
    },
    {
        id: 'k-league-2',
        name: 'K LEAGUE 2',
        country: 'South Korea',
        gradientFrom: 'from-green-500',
        gradientTo: 'to-blue-500',
    },
];

{
    /*
    <Image 로코컨테이너안쪽을 이것으로 교체할거임
        src={league.logo}
        alt={`${league.name} logo`}
        width={112}
        height={112}
        className={styles.logo}
    />
    */
}

export function LeagueGrid() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {LEAGUES.map((league) => (
                <LeagueCard key={league.id} {...league} />
            ))}
        </div>
    );
}
