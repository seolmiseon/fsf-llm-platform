import {
    ApiResponse,
    Competition,
    MatchResponse,
    StandingsResponse,
    TeamResponse,
} from '@/types/api/responses';

export class FootballDataApi {
    private readonly baseUrl: string;

    constructor(baseUrl = '/api/football') {
        this.baseUrl = baseUrl;
    }

    private async fetchApi<T>(path: string): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}?path=${path}`);
            console.debug(
                `API Response Status: ${response.status} for path: ${path}`
            );
            const responseData = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: responseData.error || response.statusText,
                };
            }

            // API 응답 구조에 따라 데이터 추출
            let data = responseData;

            // competitions 엔드포인트 처리
            if (path === '/competitions') {
                data = responseData.competitions || responseData;
            }
            // teams 엔드포인트 처리 추가
            // API 응답에서 teams 배열이 있다면 그것을 사용
            else if (path.includes('/teams')) {
                data = responseData.teams || responseData;
            }
            // matches 엔드포인트 처리
            else if (path.includes('/matches')) {
                data = responseData.matches || responseData;
            }

            // 디버깅을 위한 로그 추가
            console.log('Processed API data:', {
                path,
                rawData: responseData,
                processedData: data,
            });

            return {
                success: true,
                data,
            };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Unknown error occurred',
            };
        }
    }

    async getCompetitions(): Promise<ApiResponse<Competition[]>> {
        return this.fetchApi<Competition[]>('/competitions');
    }

    async getCompetition(
        competitionId: string
    ): Promise<ApiResponse<Competition>> {
        return this.fetchApi<Competition>(`/competitions/${competitionId}`);
    }

    async getTeamsByCompetition(
        competitionId: string
    ): Promise<ApiResponse<TeamResponse[]>> {
        if (!competitionId) {
            return {
                success: false,
                error: 'Competition ID is required',
            };
        }

        // competitionId가 유효한 형식인지 검사
        if (!/^\d+$/.test(competitionId)) {
            return {
                success: false,
                error: 'Invalid competition ID format',
            };
        }
        return this.fetchApi<TeamResponse[]>(
            `/competitions/${competitionId}/teams`
        );
    }

    async getTeam(teamId: string): Promise<ApiResponse<TeamResponse>> {
        return this.fetchApi<TeamResponse>(`/teams/${teamId}`);
    }

    async getMatch(matchId: string): Promise<ApiResponse<MatchResponse>> {
        return this.fetchApi<MatchResponse>(`/matches/${matchId}`);
    }

    async getLiveMatches(): Promise<ApiResponse<MatchResponse[]>> {
        try {
            const response = await fetch(
                `${this.baseUrl}?path=/matches&status=IN_PLAY`,
                {
                    next: { revalidate: 60 }, // 1분 캐싱
                }
            );

            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to fetch live matches: ${response.statusText}`,
                };
            }

            const data = await response.json();
            return {
                success: true,
                data: data.matches,
            };
        } catch (error: unknown) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to fetch live matches',
            };
        }
    }

    async getStandings(
        competitionId: string
    ): Promise<ApiResponse<StandingsResponse>> {
        return this.fetchApi<StandingsResponse>(
            `/competitions/${competitionId}/standings`
        );
    }
}
