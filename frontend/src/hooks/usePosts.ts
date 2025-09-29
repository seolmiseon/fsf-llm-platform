import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    updateDoc,
    increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Post } from '@/types/community/community';
import { useAuthStore } from '@/store/useAuthStore';

export type SortOption = 'latest' | 'popular';

export function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('latest');
    const { user, loading: authLoading } = useAuthStore();

    const fetchPosts = useCallback(async () => {
        if (authLoading) return;
        if (!db) return;

        try {
            setLoading(true);
            const postsQuery = query(
                collection(db, 'community'),
                orderBy(sortBy === 'latest' ? 'createdAt' : 'views', 'desc')
            );

            const querySnapshot = await getDocs(postsQuery);
            const fetchedPosts = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Post[];

            setPosts(fetchedPosts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            setError('게시글을 불러오는 중 문제가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [sortBy, authLoading]);

    const incrementViews = useCallback(
        async (id: string) => {
            if (authLoading) return;
            if (!user || !db) {
                console.error('로그인이 필요합니다');
                return;
            }

            try {
                const postRef = doc(db, 'community', id);
                await updateDoc(postRef, {
                    views: increment(1),
                });

                // 로컬 상태 업데이트
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
        [authLoading, user]
    );

    // 좋아요 토글 함수 추가
    const toggleLike = useCallback(async (id: string) => {
        if (!db) return;
        try {
            const postRef = doc(db, 'community', id);
            // 좋아요 수 업데이트
            await updateDoc(postRef, {
                likes: increment(1),
            });

            setPosts((prev) =>
                prev.map((post) =>
                    post.id === id ? { ...post, likes: post.likes + 1 } : post
                )
            );
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }, []);

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
    };
}
