import { Post } from '@/types/community/community';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';
import { Timestamp, FieldValue } from 'firebase/firestore';
interface PostItemProps {
    post: Post;
    onIncrementView: (id: string) => Promise<void>;
    onToggleLike: (id: string) => Promise<void>;
}

function isTimestamp(value: Timestamp | FieldValue): value is Timestamp {
    return value && typeof value === 'object' && 'toDate' in value;
}

export function PostItem({
    post,
    onIncrementView,
    onToggleLike,
}: PostItemProps) {
    const handleViewIncrement = (id: string | undefined) => {
        if (!id) return;
        onIncrementView(id);
    };

    const handleLikeToggle = (id: string | undefined) => {
        if (!id) return;
        onToggleLike(id);
    };

    return (
        <div className="block border rounded-lg p-4 hover:border-blue-500 transition-colors">
            <Link
                href={`/community/${post.id}`}
                onClick={() => handleViewIncrement(post.id)}
                className="block"
            >
                <div className="flex justify-between items-start">
                    <h2 className="text-xl font-semibold">{post.title}</h2>
                    <span className="text-sm text-gray-500">
                        {isTimestamp(post.createdAt)
                            ? formatDistanceToNow(post.createdAt.toDate(), {
                                  addSuffix: true,
                                  locale: ko,
                              })
                            : '날짜 정보 없음'}
                    </span>
                </div>
                <div className="mt-2 text-gray-600 line-clamp-2">
                    {post.content}
                </div>
            </Link>
            <div className="mt-3 flex items-center text-sm text-gray-500 space-x-4">
                <span>{post.authorName}</span>
                <span>조회 {post.views}</span>
                <button
                    onClick={() => handleLikeToggle(post.id)}
                    className="hover:text-blue-500"
                >
                    좋아요 {post.likes}
                </button>
                <span>댓글 {post.commentCount}</span>
            </div>
        </div>
    );
}
