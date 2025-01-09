import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const path = searchParams.get('path');

        if (!path) {
            return NextResponse.json(
                { error: 'Path parameter is required' },
                { status: 400 }
            );
        }

        const response = await fetch(
            `https://api.football-data.org/v4/${path}`,
            {
                headers: {
                    'X-Auth-Token': process.env.FOOTBALL_API_KEY as string,
                },
                next: { revalidate: 60 }, //1분캐싱싱
            }
        );

        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json(
                { error: `API Error: ${data.message || response.statusText}` },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.log('요청실패', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
