export async function generateStaticParams() {
    return [
        { leagueId: 'PL' }, // Premier League
        { leagueId: 'PD' }, // La Liga
        { leagueId: 'SA' }, // Serie A
        { leagueId: 'BL1' }, // Bundesliga
        { leagueId: 'FL1' }, // Ligue 1
    ];
}

export default function LeagueLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
