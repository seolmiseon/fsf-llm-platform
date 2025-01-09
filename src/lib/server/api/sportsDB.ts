import { TeamImages } from '@/types/api/sports-db';

export class SportsDBApi {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = '@/app/api/sports-db';
    }

    async getTeamImages(teamName: string): Promise<TeamImages> {
        const response = await fetch(
            `${this.baseUrl}?team=${encodeURIComponent(teamName)}`
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch team images: ${response.statusText}`
            );
        }

        const data = await response.json();

        return {
            teamBadge: data.teams?.[0]?.strTeamBadge,
            teamJersey: data.teams?.[0]?.strTeamJersey,
            teamLogo: data.teams?.[0]?.strTeamLogo,
            teamBanner: data.teams?.[0]?.strTeamBanner,
            stadium: data.teams?.[0]?.strStadiumThumb,
        };
    }
}
