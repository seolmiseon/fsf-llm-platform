// frontend/src/lib/client/api/TeamData.ts

import { getPlaceholderImageUrl } from '@/utils/imageUtils';
import { FootballDataApi } from './football-data';
import { YouTubeHighlightApi } from './scoreHighlight';
import { SportsDBApi } from './sportsDB';
import {
    MatchResponse,
    SquadByPosition,
    TeamResponse,
    TeamImages,
} from '@/types/api/responses';
import { YouTubeHighlight } from '@/types/api/score-match';  // 변경

export class TeamData {
    private footballDataApi: FootballDataApi;
    private YouTubeHighlightApi: YouTubeHighlightApi;
    private sportsDBApi: SportsDBApi;

    constructor() {
        this.footballDataApi = new FootballDataApi();
        this.YouTubeHighlightApi = new YouTubeHighlightApi();
        this.sportsDBApi = new SportsDBApi();
    }

    async getTeamDetailedInfo(
        competitionId: string | undefined,
        teamId: string
    ): Promise<TeamResponse> {
        if (!competitionId) {
            throw new Error('Competition ID is required');
        }

        if (!/^\d+$/.test(competitionId)) {
            throw new Error('Invalid competition ID format');
        }

        if (!teamId || teamId.trim() === '') {
            throw new Error('Team ID is required');
        }

        try {
            // 리그존재 여부 확인하기
            const competitionResponse =
                await this.footballDataApi.getCompetition(competitionId);

            const competition = competitionResponse.success
                ? competitionResponse.data
                : null;

            if (!competition) {
                throw new Error(
                    `Competition with ID ${competitionId} not found`
                );
            }

            // 팀목록 가져오기
            const teamsResponse =
                await this.footballDataApi.getTeamsByCompetition(competitionId);

            if (!teamsResponse.success) {
                throw new Error(
                    teamsResponse.error ||
                        'Failed to fetch teams for competition'
                );
            }

            const teams = teamsResponse.success ? teamsResponse.data : [];
            const team = teams.find((t) => t.id.toString() === teamId);

            if (!team) {
                throw new Error(
                    `Team ${teamId} not found in competition ${competition.name}`
                );
            }

            // 이미지 정보 가져오기
            let teamImages: TeamImages = {};
            try {
                const imagesResponse = await this.sportsDBApi.getTeamImages(
                    team.name
                );
                if (imagesResponse.success) {
                    teamImages = imagesResponse.data;
                }
            } catch (imageError) {
                console.warn('Failed to fetch team images:', {
                    error: imageError,
                    teamId: team.name,
                });
            }

            return {
                ...team,
                images: {
                    badge:
                        teamImages.teamBadge ||
                        team.crest ||
                        getPlaceholderImageUrl('badge'),
                    stadium:
                        teamImages.stadium || '/images/default-stadium.png',
                },
                squad: team.squad,
                organizedSquad: this.organizeSquadByPosition(team.squad),
                competition: {
                    id: competition.id,
                    name: competition.name,
                    area: competition.area,
                },
            };
        } catch (error) {
            console.error('Error in getTeamDetailedInfo:', {
                error,
                competitionId,
                teamId,
            });
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to fetch team information');
        }
    }

    async getMatchDetails(
        matchId: string
    ): Promise<MatchResponse & { highlights: YouTubeHighlight[] }> {  // 변경
        if (!matchId || !/^\d+$/.test(matchId)) {
            throw new Error('Invalid match ID format');
        }

        try {
            const matchResponse = await this.footballDataApi.getMatch(matchId);

            if (!matchResponse.success) {
                throw new Error(
                    matchResponse.error || 'Failed to fetch match details'
                );
            }

            const match = matchResponse.success ? matchResponse.data : null;

            if (!match) {
                throw new Error('Failed to fetch match details');
            }

            let highlights: YouTubeHighlight[] = [];  // 변경
            try {
                const highlightsResponse =
                    await this.YouTubeHighlightApi.getMatchHighlights(
                        match.homeTeam.name,
                        match.awayTeam.name,
                        match.utcDate
                    );
                highlights = highlightsResponse.success
                    ? highlightsResponse.data
                    : [];
            } catch (highlightError) {
                console.warn('Failed to fetch highlights:', {
                    error: highlightError,
                    matchId,
                    homeTeam: match.homeTeam.name,
                    awayTeam: match.awayTeam.name,
                });
            }

            return {
                ...match,
                highlights,
            };
        } catch (error) {
            console.error('Error in getMatchDetails:', {
                error,
                matchId,
            });
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to fetch match details');
        }
    }

    private organizeSquadByPosition(
        squad: TeamResponse['squad']
    ): SquadByPosition {
        const positionMap = new Map([
            ['forward', 'forwards'],
            ['striker', 'forwards'],
            ['midfielder', 'midfielders'],
            ['defender', 'defenders'],
            ['goalkeeper', 'goalkeepers'],
        ]);

        return {
            forwards: squad.filter(
                (p) => positionMap.get(p.position.toLowerCase()) === 'forwards'
            ),
            midfielders: squad.filter(
                (p) =>
                    positionMap.get(p.position.toLowerCase()) === 'midfielders'
            ),
            defenders: squad.filter(
                (p) => positionMap.get(p.position.toLowerCase()) === 'defenders'
            ),
            goalkeepers: squad.filter(
                (p) =>
                    positionMap.get(p.position.toLowerCase()) === 'goalkeepers'
            ),
        };
    }
}