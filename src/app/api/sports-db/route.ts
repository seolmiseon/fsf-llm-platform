import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const teamName = searchParams.get('team');
        const playerId = searchParams.get('playerId');

        if (playerId) {
            const response = await fetch(
                `${
                    process.env.NEXT_PUBLIC_FOOTBALL_BASE_URL
                }/lookupplayer.php?id=${encodeURIComponent(playerId)}`,
                {
                    next: { revalidate: 3600 },
                }
            );
            const data = await response.json();
            return NextResponse.json(data);
        }

        if (!teamName) {
            return NextResponse.json(
                { error: 'Team name is required' },
                { status: 400 }
            );
        }

        const response = await fetch(
            `${
                process.env.NEXT_PUBLIC_FOOTBALL_BASE_URL
            }/searchteams.php?t=${encodeURIComponent(teamName)}`,
            {
                next: { revalidate: 3600 }, //1시간 캐싱싱
            }
        );

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('SportsDB API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
