import {
    ApiResponse,
    Competition,
    MatchResponse,
    StandingsResponse,
    TeamResponse,
} from '@/types/api/responses';

const productionBackendUrl = 'https://fsf-server-303660711261.asia-northeast3.run.app';

// 프로덕션에서는 절대 localhost를 사용하지 않도록 강제
// NEXT_PUBLIC_BACKEND_URL 우선, 없으면 NEXT_PUBLIC_API_URL 사용
function getDefaultBackendUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) {
    return productionBackendUrl;
  }
  if (envUrl.includes('localhost')) {
    // localhost가 설정되어 있으면 Cloud Run URL로 강제 변경
    console.warn('⚠️ localhost URL이 감지되었습니다. Cloud Run URL로 변경합니다.');
    return productionBackendUrl;
  }
  return envUrl;
}

const DEFAULT_BACKEND_URL = getDefaultBackendUrl();

export class FootballDataApi {
    private readonly baseUrl: string;

    constructor(baseUrl = `${DEFAULT_BACKEND_URL}/api/football`) {
        // 슬래시 중복 방지
        this.baseUrl = baseUrl.replace(/\/+$/, '');
    }

    private async fetchApi<T>(path: string): Promise<ApiResponse<T>> {
        try {
            const normalizedPath = path.startsWith('/')
                ? path
                : `/${path}`;
            
            // 런타임에서도 localhost 체크 (빌드 시점 환경변수 문제 대비)
            let finalUrl = `${this.baseUrl}${normalizedPath}`;
            if (finalUrl.includes('localhost:8000') || finalUrl.includes('localhost:8080')) {
                console.warn('⚠️ 런타임에서 localhost URL이 감지되었습니다. Cloud Run URL로 변경합니다.');
                finalUrl = finalUrl.replace(/http:\/\/localhost:\d+/, 'https://fsf-server-303660711261.asia-northeast3.run.app');
            }
            
            const response = await fetch(finalUrl);
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
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        return this.fetchApi<MatchResponse[]>(`/matches${query}`);
    }

    async getLiveMatches(): Promise<ApiResponse<MatchResponse[]>> {
        return this.fetchApi<MatchResponse[]>('/matches/live');
    }

    async getStandings(
        competitionId: string
    ): Promise<ApiResponse<StandingsResponse>> {
        return this.fetchApi<StandingsResponse>(
            `/standings/${competitionId}/standings`
        );
    }
}
