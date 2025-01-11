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
            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || response.statusText,
                };
            }

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
                `${this.baseUrl}?path=/matches?status=LIVE`,
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
