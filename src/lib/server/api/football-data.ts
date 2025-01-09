import {
    Competition,
    MatchResponse,
    TeamResponse,
} from '@/types/api/responses';

export class FootballDataApi {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = '@/app/api/football';
    }

    // private getHeaders(): HeadersInit {
    //     return {
    //         'X-Auth-Token': this.apiKey,
    //     };
    // }

    async getCompetitions(): Promise<Competition[]> {
        const response = await fetch(`${this.baseUrl}?path=/competitions`);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch competitions: ${response.statusText}`
            );
        }

        const data = await response.json();
        return data.competitions; // API 응답 구조에 따라 이 부분 조정 필요
    }

    async getCompetition(competitionId: string): Promise<Competition> {
        const response = await fetch(
            `${this.baseUrl}?path=/competitions/${competitionId}`
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch competition: ${response.statusText}`
            );
        }

        return response.json();
    }

    // 해당 리그의 팀 목록 가져오기
    async getTeamsByCompetition(
        competitionId: string
    ): Promise<TeamResponse[]> {
        const response = await fetch(
            `${this.baseUrl}?path=/competitions/${competitionId}/teams`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch teams: ${response.statusText}`);
        }

        const data = await response.json();
        return data.teams;
    }

    async getTeam(teamId: string): Promise<TeamResponse> {
        const response = await fetch(`${this.baseUrl}?path=/teams/${teamId}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch team: ${response.statusText}`);
        }

        return response.json();
    }

    async getMatch(matchId: string): Promise<MatchResponse> {
        const response = await fetch(
            `${this.baseUrl}?path=/matches/${matchId}`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch match: ${response.statusText}`);
        }

        return response.json();
    }
}
