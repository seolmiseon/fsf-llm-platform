'use client ';

import { db } from '@/lib/firebase/config';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
    collection,
    getDocs,
    orderBy,
    query,
    Timestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

interface Comment {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: Timestamp;
}

interface CommentListProps {
    postId: string;
}

export function CommentList({ postId }: CommentListProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const commentRef = collection(
                    db,
                    'community',
                    postId,
                    'comments'
                );
                const q = query(commentRef, orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);

                const commentData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Comment[];

                setComments(commentData);
            } catch (error) {
                console.error('댓글 로딩 실패:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchComments();
    }, [postId]);

    if (loading) {
        return <div className="text-center py-4">댓글 불러오는 중...</div>;
    }
    if (comments.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                첫 댓글을 작성해보세요!
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {comments.map((comment) => (
                <div key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">
                            {comment.authorName}
                        </span>
                        <span className="text-sm text-gray-500">
                            {formatDistanceToNow(
                                new Date(comment.createdAt?.toDate()),
                                {
                                    addSuffix: true,
                                    locale: ko,
                                }
                            )}
                        </span>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                </div>
            ))}
        </div>
    );
}
