import {
    ApiResponse,
    Competition,
    MatchResponse,
    StandingsResponse,
    TeamResponse,
} from '@/types/api/responses';

// FSF 프로젝트 백엔드 서버 URL (Cloud Run)
const productionBackendUrl = 'https://fsf-server-303660711261.asia-northeast3.run.app';

// 백엔드 URL 결정 로직
// 프로덕션 빌드에서는 localhost를 무시하고 production URL만 사용
// 로컬 개발 환경에서는 localhost 허용
function getDefaultBackendUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 환경변수가 없으면 production URL 사용
  if (!envUrl) {
    return productionBackendUrl;
  }
  
  // 프로덕션 빌드에서 localhost가 포함되어 있으면 무시하고 production URL 사용
  if (isProduction && envUrl.includes('localhost')) {
    console.warn('⚠️ 프로덕션 빌드에서 localhost가 감지되었습니다. Production URL을 사용합니다.');
    return productionBackendUrl;
  }
  
  // 로컬 개발 환경이거나 프로덕션 URL이면 그대로 사용
  return envUrl;
}

// FootballDataApi 클래스가 사용하는 백엔드 서버 기본 URL
// 값: https://fsf-server-303660711261.asia-northeast3.run.app (또는 환경변수에서 설정한 값)
const DEFAULT_BACKEND_URL = getDefaultBackendUrl();

// 디버깅: 빌드 시점 URL 확인
if (typeof window !== 'undefined') {
  console.log('🔍 FootballDataApi - DEFAULT_BACKEND_URL:', DEFAULT_BACKEND_URL);
}

export class FootballDataApi {
    private readonly baseUrl: string;

    constructor(baseUrl = `${DEFAULT_BACKEND_URL}/api/football`) {
        // 슬래시 중복 방지
        let url = baseUrl.replace(/\/+$/, '');
        
        // getDefaultBackendUrl에서 이미 localhost를 필터링했지만, 혹시 모를 경우를 대비한 안전장치
        if (url.includes('localhost')) {
            console.error('❌ 생성자에서 localhost가 감지되었습니다. 이는 getDefaultBackendUrl 로직 오류입니다.');
            const pathMatch = url.match(/\/api\/football.*$/);
            const path = pathMatch ? pathMatch[0] : '/api/football';
            url = `${productionBackendUrl}${path}`;
        }
        
        this.baseUrl = url;
        
        // 디버깅: 생성자에서 설정된 baseUrl 확인
        if (typeof window !== 'undefined') {
          console.log('🔍 FootballDataApi constructor - baseUrl:', this.baseUrl);
        }
    }

    private async fetchApi<T>(path: string): Promise<ApiResponse<T>> {
        try {
            const normalizedPath = path.startsWith('/')
                ? path
                : `/${path}`;
            
            // getDefaultBackendUrl과 생성자에서 이미 localhost를 필터링했지만, 최종 안전장치
            let finalUrl = `${this.baseUrl}${normalizedPath}`;
            
            if (finalUrl.includes('localhost')) {
                console.error('❌ 런타임에서 localhost가 감지되었습니다. 이는 심각한 오류입니다.');
                const pathMatch = finalUrl.match(/\/api\/football.*$/);
                const path = pathMatch ? pathMatch[0] : '/api/football' + normalizedPath;
                finalUrl = `${productionBackendUrl}${path}`;
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
