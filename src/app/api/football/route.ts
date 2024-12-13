import { NextResponse } from 'next/server';

export async function GET(internalRequest: Request) {
    try {
        const externalRequest = new Request(
            'https://api.football-data.org/v4/matches',
            {
                headers: {
                    'X-Auth-Token': process.env.FOOTBALL_API_KEY as string,
                },
            }
        );
        const externalResponse = await fetch(externalRequest);
        const data = await externalResponse.json();
        console.log('요청성공', data);
        const internalResponse = NextResponse.json(data);
        const internalRequestHeader = internalRequest.headers;
        internalResponse.headers.set(
            'Access-Control-Allow-Origin',
            internalRequestHeader.get('Origin') || '*'
        );
        internalResponse.headers.set(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS'
        );
        internalResponse.headers.set(
            'Access-Control-Allow-Headers',
            'Content-Type, X-Auth-Token, Authorization'
        );
        return internalResponse;
    } catch (error) {
        console.log('요청실패', error);
        // error.status(500).json({ message: 'API 요청에 실패했습니다.' });
    }
}
