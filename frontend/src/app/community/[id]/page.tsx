'use client';

import { CommentForm } from '@/components/community/board/CommentForm';
import { CommentList } from '@/components/community/board/CommentList';
import { MoreMenu } from '@/components/community/MoreMenu';
import { AlertDialog } from '@/components/ui/alert/Alert';
import { Button } from '@/components/ui/button/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useModalStore } from '@/store/useModalStore';
import { Post } from '@/types/community/community';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Timestamp, FieldValue } from 'firebase/firestore';
import { BackendApi } from '@/lib/client/api/backend';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

type AlertDialogState = {
    isOpen: boolean;
    message: string;
    variant: 'default' | 'destructive' | 'success';
};

function isTimestamp(value: Timestamp | FieldValue): value is Timestamp {
    return value && typeof value === 'object' && 'toDate' in value;
}
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
        imageUrl: null,
    };
}

export default function PostDetailPage() {
    const { user, loading: authLoading } = useAuthStore();
    const { open: openModal } = useModalStore();
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
    const backendApi = useMemo(() => new BackendApi(), []);

    // 신고 모달 열기
    const handleOpenReportModal = () => {
        if (!post?.id) return;
        openModal('report', {
            kind: 'report',
            targetType: 'post',
            targetId: post.id,
        });
    };

    useEffect(() => {
        const fetchPost = async () => {
            if (!params.id) return;

            try {
                setLoading(true);
                const response = await backendApi.getPost(params.id as string);

                if (response.success && response.data) {
                    const postData = mapBackendPostToFrontend(response.data);
                    setPost(postData);
                } else {
                    setError(response.error || '게시글을 찾을 수 없습니다');
                }
            } catch (error) {
                console.error('Error fetching post:', error);
                setError('게시글을 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [params.id, backendApi]);

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
            const response = await backendApi.deletePost(post.id as string);
            
            if (response.success) {
                setAlertDialog({
                    isOpen: true,
                    message: '게시글이 삭제되었습니다.',
                    variant: 'success',
                });
                setTimeout(() => {
                    router.push('/community');
                }, 1500);
            } else {
                setAlertDialog({
                    isOpen: true,
                    message: response.error || '게시글 삭제 중 오류가 발생했습니다.',
                    variant: 'destructive',
                });
            }
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
                        <Link 
                            href={`/user/${post.authorId}`}
                            className="font-medium text-gray-700 hover:text-green-600 hover:underline transition"
                        >
                            {post.authorName}
                        </Link>
                        <span>조회 {post.views}</span>
                        <span>좋아요 {post.likes}</span>
                        <span>댓글 {post.commentCount}</span>
                        {/* 더보기 메뉴 (본인 글 제외) */}
                        {user && user.uid !== post.authorId && (
                            <MoreMenu onReport={handleOpenReportModal} />
                        )}
                    </div>
                    <div className="border-t border-b py-8">{post.content}</div>
                    {post.imageUrl && (
                        <div className="mt-4">
                            <Image
                                src={post.imageUrl}
                                alt="게시글 이미지"
                                width={400}
                                height={400}
                                className="rounded-lg w-auto h-auto"
                            />
                        </div>
                    )}
                </div>
                <CommentList postId={post.id!} />
                <CommentForm postId={post.id!} />

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
