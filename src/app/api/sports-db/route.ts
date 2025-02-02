import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const teamName = searchParams.get('team');
        const playerId = searchParams.get('playerId');

        if (playerId) {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SPORTS_DB_BASE_URL}/${
                    process.env.NEXT_PUBLIC_SPORTS_DB_API_KEY
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
            `${process.env.NEXT_PUBLIC_SPORTS_DB_BASE_URL}/${
                process.env.NEXT_PUBLIC_SPORTS_DB_API_KEY
            }/searchteams.php?t=${encodeURIComponent(teamName)}`,
            {
                next: { revalidate: 3600 },
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
