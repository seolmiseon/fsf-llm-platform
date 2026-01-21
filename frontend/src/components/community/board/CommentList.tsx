'use client';

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
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useModalStore } from '@/store/useModalStore';
import { MoreMenu } from '../MoreMenu';

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
    const { user } = useAuthStore();
    const { open: openModal } = useModalStore();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);

    // 댓글 신고 모달 열기
    const handleOpenReportModal = (commentId: string) => {
        openModal('report', {
            kind: 'report',
            targetType: 'comment',
            targetId: commentId,
        });
    };

    useEffect(() => {
        const fetchComments = async () => {
            if (!db) return;

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
                        <Link 
                            href={`/user/${comment.authorId}`}
                            className="font-medium text-gray-900 hover:text-green-600 hover:underline transition"
                        >
                            {comment.authorName}
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                                {formatDistanceToNow(
                                    new Date(comment.createdAt?.toDate()),
                                    {
                                        addSuffix: true,
                                        locale: ko,
                                    }
                                )}
                            </span>
                            {/* 더보기 메뉴 (본인 댓글 제외) */}
                            {user && user.uid !== comment.authorId && (
                                <MoreMenu 
                                    onReport={() => handleOpenReportModal(comment.id)} 
                                />
                            )}
                        </div>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                </div>
            ))}
        </div>
    );
}
