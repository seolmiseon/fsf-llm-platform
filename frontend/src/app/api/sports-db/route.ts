import { NextResponse } from 'next/server';

const SPORTS_DB_BASE_URL =
    process.env.NEXT_PUBLIC_SPORTS_DB_BASE_URL ||
    'https://www.thesportsdb.com/api/v1/json';
const API_KEY = process.env.SPORTS_DB_API_KEY || '3';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const team = searchParams.get('team');
        const name = searchParams.get('name');
        const type = searchParams.get('type');

        if (team) {
            const response = await fetch(
                `${SPORTS_DB_BASE_URL}/${API_KEY}/searchteams.php?t=${encodeURIComponent(
                    team
                )}`,
                {
                    headers: { Accept: 'application/json' },
                    next: { revalidate: 3600 },
                }
            );

            if (!response.ok) {
                return NextResponse.json(
                    { error: 'Failed to fetch team data' },
                    { status: response.status }
                );
            }

            const data = await response.json();
            return NextResponse.json(data);
        }
        // 선수/매니저 이미지 검색
        if (name && type) {
            let endpoint =
                type === 'player'
                    ? `searchplayers.php?p=${encodeURIComponent(name)}`
                    : `searchmanager.php?t=${encodeURIComponent(name)}`;

            const response = await fetch(
                `${SPORTS_DB_BASE_URL}/${API_KEY}/${endpoint}`,
                {
                    headers: { Accept: 'application/json' },
                    next: { revalidate: 3600 },
                }
            );

            if (!response.ok) {
                return NextResponse.json(
                    { error: `Failed to fetch ${type} data` },
                    { status: response.status }
                );
            }

            const data = await response.json();
            return NextResponse.json(data);
        }

        return NextResponse.json(
            { error: 'Missing required parameters' },
            { status: 400 }
        );
    } catch (error) {
        console.error('SportsDB API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
