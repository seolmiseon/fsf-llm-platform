import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch(
            `https://www.scorebat.com/video-api/v3/feed/?token=${process.env.NEXT_PUBLIC_SCOREBAT_API_KEY}`,
            {
                next: { revalidate: 60 }, //1분캐싱
                headers: { 'Content-Type': 'application/json' },
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'ScoreBat API Error' },
                {
                    status: response.status,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET',
                        'Access-Control-Allow-Headers':
                            'Content-Type, Authorization',
                    },
                }
            );
        }

        const data = await response.json();

        return NextResponse.json(data, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    } catch (error) {
        console.error('ScoreBat API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                    'Access-Control-Allow-Headers':
                        'Content-Type, Authorization',
                },
            }
        );
    }
}
