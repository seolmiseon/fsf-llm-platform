'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button/Button';
import { usePosts } from '@/hooks/usePosts';
import { PostItem } from './PostItem';

interface PostListProps {}

export default function PostList({}: PostListProps) {
    const { posts, loading, error, incrementViews, toggleLike } = usePosts();

    if (loading) {
        return <div className="text-center py-10">로딩 중...</div>;
    }
    if (error) {
        return <div className="text-center text-red-500 py-10">{error}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">커뮤니티</h1>
                <Link href="/community/write">
                    <Button>글쓰기</Button>
                </Link>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    작성된 게시글이 없습니다.
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <PostItem
                            key={post.id}
                            post={post}
                            onIncrementView={incrementViews}
                            onToggleLike={toggleLike}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
