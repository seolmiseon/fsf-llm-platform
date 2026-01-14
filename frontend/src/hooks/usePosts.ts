import { useState, useEffect, useCallback, useMemo } from 'react';
import { BackendApi } from '@/lib/client/api/backend';
import { Post } from '@/types/community/community';
import { useAuthStore } from '@/store/useAuthStore';
import { Timestamp } from 'firebase/firestore';

export type SortOption = 'latest' | 'popular';

// 백엔드 API 응답을 프론트엔드 Post 타입으로 변환
function mapBackendPostToFrontend(backendPost: any): Post {
    return {
        id: backendPost.post_id,
        title: backendPost.title,
        content: backendPost.content,
        authorId: backendPost.author_id,
        authorName: backendPost.author_username || null,
        createdAt: backendPost.created_at 
            ? (typeof backendPost.created_at === 'string' 
                ? Timestamp.fromDate(new Date(backendPost.created_at))
                : backendPost.created_at)
            : Timestamp.now(),
        updatedAt: backendPost.updated_at 
            ? (typeof backendPost.updated_at === 'string'
                ? Timestamp.fromDate(new Date(backendPost.updated_at))
                : backendPost.updated_at)
            : Timestamp.now(),
        likes: backendPost.likes || 0,
        views: backendPost.views || 0,
        commentCount: backendPost.comment_count || 0,
        imageUrl: null, // 백엔드 API에 imageUrl이 없으면 null
    };
}

export function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('latest');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const { user } = useAuthStore();
    
    const backendApi = useMemo(() => new BackendApi(), []);

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await backendApi.getPosts(page, 10);

            if (response.success && response.data) {
                const fetchedPosts = response.data.posts.map(mapBackendPostToFrontend);

                // 정렬 (백엔드에서 이미 정렬되어 오지만, 클라이언트에서도 정렬)
                const sortedPosts = [...fetchedPosts].sort((a, b) => {
                    if (sortBy === 'latest') {
                        const aTime = a.createdAt instanceof Timestamp
                            ? a.createdAt.toMillis()
                            : 0;
                        const bTime = b.createdAt instanceof Timestamp
                            ? b.createdAt.toMillis()
                            : 0;
                        return bTime - aTime;
                    } else {
                        return b.views - a.views;
                    }
                });

                setPosts(sortedPosts);
                setTotalCount(response.data.total_count || 0);
            } else {
                setError(response.error || '게시글을 불러오는 중 문제가 발생했습니다.');
                setPosts([]);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
            setError('게시글을 불러오는 중 문제가 발생했습니다.');
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [backendApi, page, sortBy]);

    const incrementViews = useCallback(
        async (id: string) => {
            if (!user) {
                console.error('로그인이 필요합니다');
                return;
            }

            try {
                // 백엔드 API에서 게시글 조회 시 자동으로 조회수 증가
                // 여기서는 로컬 상태만 업데이트
                setPosts((prev) =>
                    prev.map((post) =>
                        post.id === id
                            ? { ...post, views: post.views + 1 }
                            : post
                    )
                );
            } catch (error) {
                console.error('Error incrementing views:', error);
            }
        },
        [user]
    );

    // 좋아요 토글 함수 (백엔드 API에 좋아요 엔드포인트가 없으면 로컬 상태만 업데이트)
    const toggleLike = useCallback(async (id: string) => {
        if (!user) {
            console.error('로그인이 필요합니다');
            return;
        }
        
        try {
            // TODO: 백엔드에 좋아요 API가 추가되면 여기서 호출
            // 현재는 로컬 상태만 업데이트
            setPosts((prev) =>
                prev.map((post) =>
                    post.id === id ? { ...post, likes: post.likes + 1 } : post
                )
            );
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }, [user]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    return {
        posts,
        loading,
        error,
        sortBy,
        setSortBy,
        incrementViews,
        toggleLike,
        page,
        setPage,
        totalCount,
    };
}
