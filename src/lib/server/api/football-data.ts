import { Competition, MatchResponse } from '@/types/api-responses';

export class FootballDataApi {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor() {
        const baseUrl = process.env.NEXT_PUBLIC_FOOTBALL_BASE_URL;
        const apiKey = process.env.NEXT_PUBLIC_FOOTBALL_API_KEY;

        if (!baseUrl || !apiKey) {
            throw new Error('Missing Football Data API configuration');
        }

        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    private getHeaders(): HeadersInit {
        return {
            'X-Auth-Token': this.apiKey,
        };
    }

    async getCompetitions(): Promise<Competition[]> {
        const response = await fetch(`${this.baseUrl}/competitions/`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch match data: ${response.status} ${response.statusText}`
            );
        }
        const data = await response.json();
        return data.competitions;
    }

    async getCompetition(competitionId: string): Promise<Competition> {
        const response = await fetch(
            `${this.baseUrl}/competitions/${competitionId}`,
            {
                headers: this.getHeaders(),
            }
        );
        if (!response.ok) {
            throw new Error(
                `Failed to fetch competition: ${response.status} ${response.statusText}`
            );
        }

        return response.json();
    }

    async getMatch(matchId: string): Promise<MatchResponse> {
        const response = await fetch(`${this.baseUrl}/matches/${matchId}`, {
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch match: ${response.status} ${response.statusText}`
            );
        }

        return response.json();
    }
}
