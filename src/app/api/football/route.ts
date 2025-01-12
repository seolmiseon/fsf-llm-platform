import { NextResponse } from 'next/server';
import { uploadImageToStorage } from '@/utils/storage';

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

        if (data.teams) {
            // 팀 배열을 순회하면서 이미지 처리
            const teamsWithStorageUrls = await Promise.all(
                data.teams.map(async (team: any) => {
                    if (team.crest) {
                        const storagePath = `teams/${team.id}/crest.png`;
                        try {
                            const storageUrl = await uploadImageToStorage(
                                team.crest,
                                storagePath
                            );
                            return {
                                ...team,
                                crest: storageUrl, // 원본 URL을 Storage URL로 교체
                            };
                        } catch (error) {
                            console.error(
                                `Failed to upload team ${team.id} crest:`,
                                error
                            );
                            return team; // 실패시 원본 데이터 유지
                        }
                    }
                    return team;
                })
            );

            data.teams = teamsWithStorageUrls;
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
