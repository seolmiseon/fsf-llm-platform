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

        const getDateRange = () => {
            const today = new Date();
            const oneWeekAgo = new Date(today);
            const futureDate = new Date(today);

            oneWeekAgo.setDate(today.getDate() - 3);
            futureDate.setDate(today.getDate() + 7);

            return {
                from: oneWeekAgo.toISOString().split('T')[0],
                to: futureDate.toISOString().split('T')[0],
            };
        };

        const baseUrl = `https://api.football-data.org/v4/${path}`;

        const apiUrl = path.includes('matches')
            ? `${baseUrl}?dateFrom=${getDateRange().from}&dateTo=${
                  getDateRange().to
              }`
            : baseUrl;

        const response = await fetch(apiUrl, {
            headers: {
                'X-Auth-Token': process.env
                    .NEXT_PUBLIC_FOOTBALL_API_KEY as string,
            },
            next: { revalidate: 60 }, //1분캐싱
        });

        const data = await response.json();
        console.log('Live matches API response:', data);

        if (!response.ok) {
            return NextResponse.json(
                { error: `API Error: ${data.message || response.statusText}` },
                { status: response.status }
            );
        }

        if (data.matches) {
            const matchesWithProcessedTeams = await Promise.all(
                data.matches.map(async (match: any) => {
                    // 홈팀 크레스트 처리
                    if (match.homeTeam?.crest) {
                        const homeStoragePath = `teams/${match.homeTeam.id}/crest.png`;
                        try {
                            const homeStorageUrl = await uploadImageToStorage(
                                match.homeTeam.crest,
                                homeStoragePath
                            );
                            match.homeTeam.crest =
                                homeStorageUrl || match.homeTeam.crest;
                        } catch (error) {
                            console.error(
                                `Failed to upload home team crest:`,
                                error
                            );
                        }
                    }

                    // 원정팀 크레스트 처리
                    if (match.awayTeam?.crest) {
                        const awayStoragePath = `teams/${match.awayTeam.id}/crest.png`;
                        try {
                            const awayStorageUrl = await uploadImageToStorage(
                                match.awayTeam.crest,
                                awayStoragePath
                            );
                            match.awayTeam.crest =
                                awayStorageUrl || match.awayTeam.crest;
                        } catch (error) {
                            console.error(
                                `Failed to upload away team crest:`,
                                error
                            );
                        }
                    }
                    return match;
                })
            );
            data.matches = matchesWithProcessedTeams;
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
                                crest: storageUrl || team.crest, // 원본 URL을 Storage URL로 교체
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
