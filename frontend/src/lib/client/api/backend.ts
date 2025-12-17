// frontend/src/lib/client/api/backend.ts

import { useAuthStore } from '@/store/useAuthStore';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 
  'https://fsf-server-303660711261.asia-northeast3.run.app';

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
    this.baseUrl = BACKEND_URL;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
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