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

export type SortOption = 'latest' | 'popular';

export function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('latest');

    const fetchPosts = useCallback(async () => {
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
    }, [sortBy]);

    const incrementViews = useCallback(async (id: string) => {
        try {
            const postRef = doc(db, 'community', id);
            await updateDoc(postRef, {
                views: increment(1),
            });

            // 로컬 상태 업데이트
            setPosts((prev) =>
                prev.map((post) =>
                    post.id === id ? { ...post, views: post.views + 1 } : post
                )
            );
        } catch (error) {
            console.error('Error incrementing views:', error);
        }
    }, []);

    // 좋아요 토글 함수 추가
    const toggleLike = useCallback(
        async (id: string) => {
            try {
                const postRef = doc(db, 'community', id);

                // 현재 게시글 찾기
                const currentPost = posts.find((post) => post.id === id);
                if (!currentPost) return;

                // 좋아요 수 업데이트
                await updateDoc(postRef, {
                    likes: increment(1),
                });

                // 로컬 상태 업데이트
                setPosts((prev) =>
                    prev.map((post) =>
                        post.id === id
                            ? { ...post, likes: post.likes + 1 }
                            : post
                    )
                );
            } catch (error) {
                console.error('Error toggling like:', error);
            }
        },
        [posts]
    );

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    return {
        posts,
        loading,
        error,
        sortBy,
        setSortBy,
        refetch: fetchPosts,
        incrementViews,
        toggleLike,
    };
}
