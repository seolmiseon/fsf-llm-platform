import { ApiResponse } from '@/types/api/responses';
import { TeamImages } from '@/types/api/sports-db';

export class SportsDBApi {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = '/api/sports-db';
    }

    async getTeamImages(teamName: string): Promise<ApiResponse<TeamImages>> {
        const response = await fetch(
            `${this.baseUrl}?team=${encodeURIComponent(teamName)}`
        );

        if (!response.ok) {
            return {
                success: false,
                error: `Failed to fetch team images: ${response.statusText}`,
            };
        }

        const data = await response.json();

        const images: TeamImages = {
            teamBadge: data.teams?.[0]?.strTeamBadge,
            teamJersey: data.teams?.[0]?.strTeamJersey,
            teamLogo: data.teams?.[0]?.strTeamLogo,
            teamBanner: data.teams?.[0]?.strTeamBanner,
            stadium: data.teams?.[0]?.strStadiumThumb,
        };
        return {
            success: true,
            data: images,
        };
    }
    catch(error: unknown) {
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Failed to fetch team images',
        };
    }

    async getPlayerImage(playerName: string): Promise<ApiResponse<string>> {
        try {
            const response = await fetch(
                `${this.baseUrl}?name=${encodeURIComponent(
                    playerName
                )}&type=player`
            );

            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to fetch player image: ${response.statusText}`,
                };
            }

            const data = await response.json();
            const imageUrl = data.player?.[0]?.strThumb;

            return {
                success: true,
                data: imageUrl,
            };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to fetch player image',
            };
        }
    }

    async getManagerImage(managerName: string): Promise<ApiResponse<string>> {
        try {
            const response = await fetch(
                `${this.baseUrl}?name=${encodeURIComponent(
                    managerName
                )}&type=manager`
            );

            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to fetch manager image: ${response.statusText}`,
                };
            }

            const data = await response.json();
            const imageUrl = data.managers?.[0]?.strThumb;

            return {
                success: true,
                data: imageUrl,
            };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to fetch manager image',
            };
        }
    }
}
