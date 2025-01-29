'use client';

import { useState } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Post } from '@/types/community/community';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textArea/TextArea';
import { AlertDialog } from '@/components/ui/alert/Alert';
import { Error } from '@/components/ui/common';
import { useAuthStore } from '@/store/useAuthStore';

// 에러 메시지 타입 정의
type ErrorType = string | null;

// 알림 다이얼로그 상태 타입 정의
type AlertDialogState = {
    isOpen: boolean;
    message: string;
    variant: 'default' | 'destructive' | 'success';
    onClose: () => void;
};

export default function PostForm() {
    const { user, loading: authLoading } = useAuthStore();
    const [error, setError] = useState<ErrorType>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertDialog, setAlertDialog] = useState<AlertDialogState>({
        isOpen: false,
        message: '',
        variant: 'default',
        onClose: () => {},
    });
    const router = useRouter();

    if (authLoading) {
        return <div className="text-center py-4">인증 상태 확인중...</div>;
    }

    if (!user) {
        return (
            <Error
                message="로그인이 필요합니다. 로그인 후 게시글을 작성할 수 있습니다."
                retry={() => router.push('/signin')}
            />
        );
    }

    const sanitizeInput = (input: string) => {
        return input.trim().replace(/<[^>]*>/g, '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (title.trim().length < 2) {
            setAlertDialog({
                isOpen: true,
                message: '제목은 2자 이상 입력해주세요.',
                variant: 'destructive',
                onClose: () => setIsSubmitting(false),
            });

            return;
        }

        if (content.trim().length < 10) {
            setAlertDialog({
                isOpen: true,
                message: '내용은 10자 이상 입력해주세요.',
                variant: 'destructive',
                onClose: () => setIsSubmitting(false),
            });

            return;
        }

        try {
            const sanitizedTitle = sanitizeInput(title);
            const sanitizedContent = sanitizeInput(content);

            const postData: Post = {
                title: sanitizedTitle,
                content: sanitizedContent,
                authorId: user.uid,
                authorName: user.displayName || '익명',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                likes: 0,
                views: 0,
                commentCount: 0,
            };
            console.log('Post Data:', postData);
            console.log('저장 시도:', {
                title: sanitizedTitle,
                content: sanitizedContent,
                user: user.uid,
            });

            const docRef = await addDoc(collection(db, 'community'), postData);
            console.log('저장 성공:', docRef.id);

            setAlertDialog({
                isOpen: true,
                message: '게시글이 작성되었습니다',
                variant: 'success',
                onClose: () => {
                    router.push('/community');
                },
            });
        } catch (error: any) {
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error,
            });
            if (error.code === 'permission-denied') {
                setError('권한이 없습니다. 로그인을 확인해주세요.');
            } else if (error.code === 'unavailable') {
                setError(
                    '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
                );
            } else {
                setError('게시글 작성에 실패했습니다.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAlertClose = () => {
        setAlertDialog((prev) => ({ ...prev, isOpen: false }));
    };

    return (
        <>
            <AlertDialog
                isOpen={alertDialog.isOpen}
                onClose={handleAlertClose}
                title={alertDialog.variant === 'success' ? '성공' : '알림'}
                description={alertDialog.message}
                variant={alertDialog.variant}
            />
            <div className="space-y-4 max-w-2xl mx-auto p-4">
                {error && (
                    <Error message={error} retry={() => setError(null)} />
                )}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="title"
                                className="block text-sm font-medium text-gray-700"
                            >
                                제목
                            </label>
                            <Input
                                id="title"
                                name="title"
                                type="text"
                                placeholder="제목을 입력해주세요"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="content"
                                className="block text-sm font-medium text-gray-700"
                            >
                                내용
                            </label>
                            <Textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="내용을 입력하세요"
                                rows={10}
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.back()}
                            >
                                취소
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? '작성 중...' : '작성하기'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
