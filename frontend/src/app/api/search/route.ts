import { NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { SearchResponse } from '@/types/ui/search';

// 프로덕션 빌드에서 localhost를 무시하고 production URL만 사용
const productionBackendUrl = 'https://fsf-server-303660711261.asia-northeast3.run.app';
const isProduction = process.env.NODE_ENV === 'production';

let BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
if (!BACKEND_URL) {
  BACKEND_URL = productionBackendUrl;
} else if (isProduction && BACKEND_URL.includes('localhost')) {
  // 프로덕션 빌드에서 localhost가 설정되어 있으면 Cloud Run URL로 강제 변경
  console.warn('⚠️ 프로덕션 빌드에서 localhost가 감지되었습니다. Cloud Run URL로 변경합니다.');
  BACKEND_URL = productionBackendUrl;
}

export async function GET(request: Request) {
    try {
        const token = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!token) {
            return NextResponse.json(
                { error: '토큰이 없습니다.' },
                { status: 401 }
            );
        }

        const decodedToken = await auth().verifyIdToken(token);
        if (!decodedToken) {
            return NextResponse.json(
                { error: '유효하지 않은 토큰입니다.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const page = parseInt(searchParams.get('page') || '1');

        if (!query?.trim()) {
            return NextResponse.json({
                results: [],
                pagination: { currentPage: page, hasMore: false },
            });
        }

        // 백엔드 API로 게시글 목록 조회
        const backendResponse = await fetch(
            `${BACKEND_URL}/api/posts/posts?page=${page}&page_size=10`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!backendResponse.ok) {
            throw new Error(`Backend API error: ${backendResponse.status}`);
        }

        const backendData = await backendResponse.json();
        
        // 클라이언트 사이드에서 검색어 필터링 (백엔드에 검색 API가 없으므로)
        const searchQuery = query.toLowerCase();
        const allPosts = backendData.posts || [];
        const filteredPosts = allPosts.filter((post: any) => 
            post.title?.toLowerCase().includes(searchQuery) ||
            post.content?.toLowerCase().includes(searchQuery)
        );

        // 페이지네이션 적용
        const limit = 10;
        const offset = (page - 1) * limit;
        const paginatedPosts = filteredPosts.slice(offset, offset + limit);
        const hasMore = filteredPosts.length > offset + limit;

        const results = paginatedPosts.map((post: any) => ({
            id: post.post_id,
            title: post.title,
            content: post.content,
            authorId: post.author_id,
            authorName: post.author_username,
            commentCount: post.comment_count || 0,
            createdAt: post.created_at 
                ? (typeof post.created_at === 'string' 
                    ? post.created_at 
                    : post.created_at.toISOString?.() || new Date().toISOString())
                : new Date().toISOString(),
            like: post.likes || 0,
            views: post.views || 0,
            updateAt: post.updated_at 
                ? (typeof post.updated_at === 'string'
                    ? post.updated_at
                    : post.updated_at.toISOString?.() || undefined)
                : undefined,
        }));

        return NextResponse.json({
            results,
            pagination: {
                currentPage: page,
                hasMore,
            },
        } as SearchResponse);
    } catch (error) {
        console.error('Search error:', error);
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json(
            { error: '검색 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
