import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const response = await fetch(
            `https://www.scorebat.com/video-api/v3/feed/?token=${process.env.SCOREBAT_API_KEY}`,
            {
                next: { revalidate: 300 }, //5분캐싱
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'ScoreBat API Error' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('ScoreBat API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
