// frontend/src/lib/client/api/backend.ts

import { useAuthStore } from '@/store/useAuthStore';

// FSF 프로젝트 백엔드 서버 URL (Cloud Run)
const productionBackendUrl = 'https://fsf-server-303660711261.asia-northeast3.run.app';

// BackendApi 클래스가 사용하는 백엔드 서버 기본 URL
// 프로덕션 배포에서는 항상 production URL만 사용
// 환경변수는 무시하고 항상 production URL 사용 (빌드 시점 localhost 포함 방지)
const BACKEND_URL = productionBackendUrl;

// 디버깅: 빌드 시점 URL 확인
if (typeof window !== 'undefined') {
  console.log('🔍 BackendApi - BACKEND_URL:', BACKEND_URL);
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StatsListResponse {
  success: boolean;
  league: string;
  count: number;
  data: Array<{
    rank?: number;
    name: string;
    team?: string;
    goals?: number;
    assists?: number;
    espn_id?: number;
  }>;
  timestamp?: string;
}

export class BackendApi {
  private baseUrl: string;

  constructor() {
    // getBackendUrl에서 이미 localhost를 필터링했지만, 혹시 모를 경우를 대비한 안전장치
    let url = BACKEND_URL;
    if (url.includes('localhost')) {
      console.error('❌ 생성자에서 localhost가 감지되었습니다. 이는 getBackendUrl 로직 오류입니다.');
      url = productionBackendUrl;
    }
    this.baseUrl = url;
    
    // 디버깅: 생성자에서 설정된 baseUrl 확인
    if (typeof window !== 'undefined') {
      console.log('🔍 BackendApi constructor - baseUrl:', this.baseUrl);
    }
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      // getBackendUrl과 생성자에서 이미 localhost를 필터링했지만, 최종 안전장치
      let finalUrl = `${this.baseUrl}${endpoint}`;
      
      if (finalUrl.includes('localhost')) {
        console.error('❌ 런타임에서 localhost가 감지되었습니다. 이는 심각한 오류입니다.');
        const pathMatch = finalUrl.match(/\/api\/.*$/);
        const path = pathMatch ? pathMatch[0] : endpoint;
        finalUrl = `${productionBackendUrl}${path}`;
      }
      
      const response = await fetch(finalUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      
      // 백엔드가 {success: true, data: ...} 형식으로 반환하는 경우 data 추출
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return {
          success: data.success,
          data: data.data,
        };
      }
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Backend API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const { user } = useAuthStore.getState();
      
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const token = await user.getIdToken();

      return this.fetch<T>(endpoint, {
        ...options,
        headers: {
          ...options?.headers,
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Auth token error:', error);
      return {
        success: false,
        error: 'Failed to get authentication token',
      };
    }
  }

  // LLM API
   async chat(message: string): Promise<ApiResponse<{
    answer: string;
    cached?: boolean;
    cache_hit?: boolean;
  }>> {
    return this.fetch('/api/llm/chat', {
      method: 'POST',
      body: JSON.stringify({ query: message }),  // ← query로 변경!
    });
  }

  // Agent API
  async agent(
    query: string,
    context?: string,
    userId?: string
  ): Promise<ApiResponse<{
    answer: string;
    tools_used: string[];
    tokens_used: number;
    confidence: number;
  }>> {
    const body: { query: string; context?: string; user_id?: string } = { query };
    if (context) body.context = context;
    if (userId) body.user_id = userId;

    return this.fetch('/api/llm/agent', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Agent API 스트리밍 버전
  async agentStream(
    query: string,
    userId: string | undefined,
    onStatus: (message: string) => void,
    onAnswer: (content: string, toolsUsed: string[], isChunk?: boolean) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const body: { query: string; user_id?: string } = { query };
    if (userId) body.user_id = userId;

    try {
      const response = await fetch(`${this.baseUrl}/api/llm/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                onStatus(data.message);
              } else if (data.type === 'answer_start') {
                // 답변 시작 - 초기화
                onAnswer('', data.tools_used || []);
              } else if (data.type === 'answer_chunk') {
                // 답변 청크 - 타이핑 효과
                onAnswer(data.content, []);
              } else if (data.type === 'answer_complete') {
                // 답변 완료 (추가 처리 없음)
              } else if (data.type === 'error') {
                onError(data.message);
                return;
              } else if (data.type === 'done') {
                return;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async matchAnalysis(matchId: number): Promise<ApiResponse<{ analysis: string }>> {
    return this.fetch(`/api/llm/match/${matchId}/analysis`, {
      method: 'POST',
    });
  }

  async playerCompare(
    player1Id: number,
    player2Id: number
  ): Promise<ApiResponse<{ comparison: string }>> {
    return this.fetch('/api/llm/player/compare', {
      method: 'POST',
      body: JSON.stringify({ player1_id: player1Id, player2_id: player2Id }),
    });
  }

  async analyzeMatchChart(
    image: File,
    question: string
  ): Promise<ApiResponse<{ analysis: string; question: string; timestamp: string }>> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('question', question);

    try {
      const response = await fetch(`${this.baseUrl}/api/llm/match/chart/analyze`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Chart analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Stats API
  async getTopScorers(
    league: string,
    limit: number = 20
  ): Promise<ApiResponse<StatsListResponse>> {
    return this.fetch(
      `/api/stats/top-scorers?league=${encodeURIComponent(league)}&limit=${limit}`
    );
  }

  async getTopAssists(
    league: string,
    limit: number = 20
  ): Promise<ApiResponse<StatsListResponse>> {
    return this.fetch(
      `/api/stats/top-assists?league=${encodeURIComponent(league)}&limit=${limit}`
    );
  }

  // Auth API
  async login(): Promise<ApiResponse<{ access_token: string; user: any }>> {
    return this.fetchWithAuth('/api/auth/login', {
      method: 'POST',
    });
  }

  async signup(
    email: string,
    username: string
  ): Promise<ApiResponse<{ access_token: string; user: any }>> {
    return this.fetchWithAuth('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, username }),
    });
  }

  // Posts API
  async getPosts(
    page: number = 1,
    pageSize: number = 10,
    category?: string
  ): Promise<ApiResponse<{
    posts: any[];
    total_count: number;
    page: number;
    page_size: number;
  }>> {
    let url = `/api/posts/posts?page=${page}&page_size=${pageSize}`;
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    return this.fetch(url);
  }

  async getPost(postId: string): Promise<ApiResponse<any>> {
    return this.fetch(`/api/posts/posts/${postId}`);
  }

  async createPost(
    title: string,
    content: string,
    category?: string
  ): Promise<ApiResponse<any>> {
    return this.fetchWithAuth('/api/posts/posts', {
      method: 'POST',
      body: JSON.stringify({ title, content, category }),
    });
  }

  async updatePost(
    postId: string,
    title: string,
    content: string,
    category?: string
  ): Promise<ApiResponse<any>> {
    return this.fetchWithAuth(`/api/posts/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, category }),
    });
  }

  async deletePost(postId: string): Promise<ApiResponse<void>> {
    return this.fetchWithAuth(`/api/posts/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  // Comments API
  async createComment(
    postId: string,
    content: string
  ): Promise<ApiResponse<any>> {
    return this.fetchWithAuth(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(
    postId: string,
    commentId: string
  ): Promise<ApiResponse<void>> {
    return this.fetchWithAuth(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Users API
  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.fetchWithAuth('/api/users/me');
  }

  async updateProfile(
    username?: string,
    bio?: string
  ): Promise<ApiResponse<any>> {
    return this.fetchWithAuth('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify({ username, bio }),
    });
  }

  // Football Data API (캐싱된 버전)
  async getStandings(competition: string = 'PL'): Promise<ApiResponse<any>> {
    return this.fetch(`/api/football/standings?competition=${competition}`);
  }

  async getMatches(
    competition: string = 'PL',
    status: string = 'FINISHED',
    limit: number = 10
  ): Promise<ApiResponse<any>> {
    return this.fetch(
      `/api/football/matches?competition=${competition}&status=${status}&limit=${limit}`
    );
  }

  async getTeams(competition: string = 'PL'): Promise<ApiResponse<any>> {
    return this.fetch(`/api/football/teams/${competition}`);
  }

  async getCompetitions(): Promise<ApiResponse<any>> {
    return this.fetch('/api/football/competitions');
  }

  // Search API (게시글 검색)
  async searchPosts(
    query: string,
    page: number = 1
  ): Promise<ApiResponse<{
    results: Array<{
      id: string;
      title: string;
      content: string;
      authorId: string;
      authorName: string;
      commentCount: number;
      createdAt: string;
      like: number;
      views: number;
      updateAt?: string;
    }>;
    pagination: {
      currentPage: number;
      hasMore: boolean;
    };
  }>> {
    return this.fetchWithAuth(
      `/api/posts/posts?search=${encodeURIComponent(query)}&page=${page}`
    );
  }
}