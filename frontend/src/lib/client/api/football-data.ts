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
            console.log('API Response Status:', response.status);

            const responseData = await response.json();
            console.log(
                'Raw API Response:',
                JSON.stringify(responseData).slice(0, 200)
            );

            if (!response.ok) {
                return {
                    success: false,
                    error: responseData.error || response.statusText,
                };
            }

            // API 응답 구조에 따라 데이터 추출
            let data = responseData.data || responseData;

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
            console.error('API Fetch Error:', {
                name: error instanceof Error ? error.name : 'Unknown',
                message:
                    error instanceof Error ? error.message : 'Unknown error',
            });

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
        return this.fetchApi<Competition>(`/standings/${competitionId}`);
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
            `/standings/${competitionId}/teams`
        );
    }

    async getTeam(teamId: string): Promise<ApiResponse<TeamResponse>> {
        return this.fetchApi<TeamResponse>(`/teams/${teamId}`);
    }

    async getMatch(matchId: string): Promise<ApiResponse<MatchResponse>> {
        return this.fetchApi<MatchResponse>(`/matches/${matchId}`);
    }

    async getMatches(status?: string): Promise<ApiResponse<MatchResponse[]>> {
        let path = '/matches';
        if (status) {
            path += `?status=${status}`;
        }
        return this.fetchApi<MatchResponse[]>(path);
    }

    async getLiveMatches(): Promise<ApiResponse<MatchResponse[]>> {
        return this.fetchApi<MatchResponse[]>('/matches');
    }

    async getStandings(
        competitionId: string
    ): Promise<ApiResponse<StandingsResponse>> {
        return this.fetchApi<StandingsResponse>(
            `/standings/${competitionId}/standings`
        );
    }
}
