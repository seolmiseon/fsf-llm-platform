export interface SearchResult {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    commentCount: number;
    createdAt: string;
    like: number;
    views: number;
    updateAt: string;
}

// 페이지네이션 정보의 구조
export interface PaginationInfo {
    currentPage: number;
    hasMore: boolean;
}

// API 응답의 전체 구조
export interface SearchResponse {
    results: SearchResult[];
    pagination: PaginationInfo;
    error?: string; // API 에러 발생 시 사용
}

// 캐시에 저장되는 데이터의 구조
export interface CachedSearchData {
    results: SearchResult[];
    hasMore: boolean;
    timestamp: number;
}
