'use client';

import { AlertDialog } from '@/components/ui/alert/Alert';
import { Button } from '@/components/ui/button/Button';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import { Post } from '@/types/community/community';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
    deleteDoc,
    doc,
    getDoc,
    Timestamp,
    FieldValue,
} from 'firebase/firestore';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type AlertDialogState = {
    isOpen: boolean;
    message: string;
    variant: 'default' | 'destructive' | 'success';
};

function isTimestamp(value: Timestamp | FieldValue): value is Timestamp {
    return value && typeof value === 'object' && 'toDate' in value;
}
export default function PostDetailPage() {
    const { user, loading: authLoading } = useAuthStore();
    const params = useParams();
    const router = useRouter();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [alertDialog, setAlertDialog] = useState<AlertDialogState>({
        isOpen: false,
        message: '',
        variant: 'default',
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            if (!params.id) return;
            try {
                const docRef = doc(db, 'community', params.id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const postData = {
                        id: docSnap.id,
                        ...docSnap.data(),
                    } as Post;
                    setPost(postData);
                } else {
                    setError('게시글을 찾을수가 없습니다');
                }
            } catch (error) {
                console.error('Error fetching post:', error);
                setError('게시글을 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [params.id]);

    const handleDelete = async () => {
        if (!post || !user || user.uid !== post.authorId) {
            setAlertDialog({
                isOpen: true,
                message: '삭제 권한이 없습니다.',
                variant: 'destructive',
            });
            return;
        }

        if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'community', post.id as string));
            setAlertDialog({
                isOpen: true,
                message: '게시글이 삭제되었습니다.',
                variant: 'success',
            });
            setTimeout(() => {
                router.push('/community');
            }, 1500);
        } catch (error) {
            console.error('Error deleting post:', error);
            setAlertDialog({
                isOpen: true,
                message: '게시글 삭제 중 오류가 발생했습니다.',
                variant: 'destructive',
            });
        }
    };

    if (authLoading) {
        return <div className="text-center py-4">인증 상태 확인중...</div>;
    }

    if (loading) {
        return <div className="text-center py-10">로딩 중...</div>;
    }

    if (error || !post) {
        return <div className="text-center text-red-500 py-10">{error}</div>;
    }

    return (
        <>
            <AlertDialog
                isOpen={alertDialog.isOpen}
                onClose={() =>
                    setAlertDialog((prev) => ({ ...prev, isOpen: false }))
                }
                description={alertDialog.message}
                variant={alertDialog.variant}
            />

            <AlertDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                description="정말로 이 게시글을 삭제하시겠습니까?"
                variant="destructive"
                title="게시글 삭제"
                onConfirm={handleDelete}
            />
            <div className="max-w-4xl mx-auto p-4">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold">{post.title}</h1>
                        <div className="text-sm text-gray-500">
                            {isTimestamp(post.createdAt)
                                ? formatDistanceToNow(post.createdAt.toDate(), {
                                      addSuffix: true,
                                      locale: ko,
                                  })
                                : '날짜 정보 없음'}
                        </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 space-x-4 mb-6">
                        <span>{post.authorName}</span>
                        <span>조회 {post.views}</span>
                        <span>좋아요 {post.likes}</span>
                        <span>댓글 {post.commentCount}</span>
                    </div>
                    <div className="border-t border-b py-8">{post.content}</div>
                </div>
                <div className="flex justify-between items-center mt-6">
                    <Link href="/community">
                        <Button variant="outline">목록으로</Button>
                    </Link>
                    {user?.uid === post.authorId && (
                        <div className="space-x-2">
                            <Link href={`/community/${post.id}/edit`}>
                                <Button>수정</Button>
                            </Link>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                            >
                                삭제
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
