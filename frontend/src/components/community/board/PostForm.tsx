'use client';

import { useEffect, useState } from 'react';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Post } from '@/types/community/community';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textArea/TextArea';
import { AlertDialog } from '@/components/ui/alert/Alert';
import { Error, Loading } from '@/components/ui/common';
import { useAuthStore } from '@/store/useAuthStore';
import { useImageUpload } from '@/hooks/useImageUpload';
import Image from 'next/image';

// 에러 메시지 타입 정의
type ErrorType = string | null;

// 알림 다이얼로그 상태 타입 정의
type AlertDialogState = {
    isOpen: boolean;
    message: string;
    variant: 'default' | 'destructive' | 'success';
    onClose: () => void;
};

interface PostFormProps {
    isEdit?: boolean;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024;

export default function PostForm({ isEdit }: PostFormProps) {
    const { user, loading: authLoading } = useAuthStore();
    const { uploadImage, loading: imageLoading } = useImageUpload();
    const [imageUrl, setImageUrl] = useState('');
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
    const params = useParams();

    useEffect(() => {
        // 수정 모드일 때 기존 데이터 불러오기
        if (isEdit) {
            const fetchPost = async () => {
                if (!db) return;
                const docRef = doc(db, 'community', params.id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const post = docSnap.data();
                    setTitle(post.title);
                    setContent(post.content);
                    setImageUrl(post.imageUrl || '');
                }
            };
            fetchPost();
        }
    }, [isEdit, params.id]);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            setError('파일 크기는 3MB 이하여야 합니다.');
            return;
        }
        try {
            const url = await uploadImage(file);
            setImageUrl(url);
        } catch (error) {
            console.error('이미지 업로드 실패', error);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];

        if (file && file.type.startsWith('image/')) {
            if (file.size > MAX_FILE_SIZE) {
                setError('파일 크기는 3MB 이하여야 합니다.');
                return;
            }
            handleFileUpload({ target: { files: [file] } } as any);
        }
    };

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
            // Firestore 초기화 체크
            if (!db) {
                setAlertDialog({
                    isOpen: true,
                    message:
                        '서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
                    variant: 'destructive',
                    onClose: () => setIsSubmitting(false),
                });
                return;
            }

            const sanitizedTitle = sanitizeInput(title);
            const sanitizedContent = sanitizeInput(content);

            if (isEdit) {
                if (!params.id) {
                    setAlertDialog({
                        isOpen: true,
                        message: '게시글 정보를 찾을 수 없습니다.',
                        variant: 'destructive',
                        onClose: () => router.push('/community'),
                    });
                    return;
                }

                const docRef = doc(db, 'community', params.id as string);
                await updateDoc(docRef, {
                    title: sanitizedTitle,
                    content: sanitizedContent,
                    imageUrl: imageUrl || null,
                    updatedAt: serverTimestamp(),
                });

                setAlertDialog({
                    isOpen: true,
                    message: '게시글이 수정되었습니다',
                    variant: 'success',
                    onClose: () => router.push(`/community/${params.id}`),
                });

                // 딜레이 타이머 설정
                const timer = setTimeout(() => {
                    router.push(`/community/${params.id}`);
                }, 1500);

                // 컴포넌트 언마운트 시 타이머 정리
                return () => clearTimeout(timer);
            } else {
                // 새 글 작성
                if (!user?.uid) {
                    setAlertDialog({
                        isOpen: true,
                        message:
                            '로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.',
                        variant: 'destructive',
                        onClose: () => router.push('/signin'),
                    });
                    return;
                }

                const postData: Post = {
                    title: sanitizedTitle,
                    content: sanitizedContent,
                    authorId: user.uid,
                    authorName: user.displayName || '익명',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    likes: 0,
                    views: 0,
                    commentCount: 0,
                    imageUrl: imageUrl || null,
                };

                const communityRef = collection(db, 'community');
                await addDoc(communityRef, postData);

                setAlertDialog({
                    isOpen: true,
                    message: '게시글이 작성되었습니다',
                    variant: 'success',
                    onClose: () => router.push('/community'),
                });
            }
        } catch (error: any) {
            console.error('게시글 처리 중 오류 발생:', error);

            // 사용자에게 보여줄 에러 메시지 구성
            let errorMessage = '게시글 처리 중 문제가 발생했습니다.';
            if (error.code) {
                switch (error.code) {
                    case 'permission-denied':
                        errorMessage = '권한이 없습니다.';
                        break;
                    case 'not-found':
                        errorMessage = '게시글을 찾을 수 없습니다.';
                        break;
                    default:
                        errorMessage = '알 수 없는 오류가 발생했습니다.';
                }
            }

            setAlertDialog({
                isOpen: true,
                message: errorMessage,
                variant: 'destructive',
                onClose: () => setIsSubmitting(false),
            });
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

                        <div>
                            <label
                                htmlFor="image"
                                className="block text-sm font-medium text-gray-700"
                            >
                                이미지
                            </label>
                            <Input
                                id="image"
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            {imageUrl && (
                                <div
                                    className="relative mt-2"
                                    onDrop={handleDrop}
                                    onDragOver={(e) => {
                                        e.preventDefault;
                                    }}
                                >
                                    <Image
                                        src={imageUrl}
                                        alt="Preview"
                                        width={200}
                                        height={200}
                                        className="max-h-[200px] w-auto rounded-lg"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setImageUrl('')}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                            {imageLoading && <Loading />}
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
                                {isSubmitting
                                    ? isEdit
                                        ? '수정 중...'
                                        : '작성 중...'
                                    : isEdit
                                    ? '수정하기'
                                    : '작성하기'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
