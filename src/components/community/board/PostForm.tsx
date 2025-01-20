'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Post } from '@/types/community/community';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textArea/TextArea';
import { onAuthStateChanged } from 'firebase/auth';

export default function PostForm() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [user, setUser] = useState(auth.currentUser);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
        });

        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (!user) {
                alert('로그인이 필요합니다');
                return;
            }

            const postData: Post = {
                title,
                content,
                authorId: user.uid,
                authorName: user.displayName || '익명',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                likes: 0,
                views: 0,
                commentCount: 0,
            };

            const docRef = await addDoc(collection(db, 'posts'), postData);

            alert('게시글이 작성되었습니다');
            router.push(`/community/${docRef.id}`);
        } catch (error) {
            console.error('Error adding post:', error);
            alert('게시글 작성에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 max-w-2xl mx-auto p-4"
        >
            <div>
                <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700"
                >
                    제목
                </label>
                <Input
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
                    id={content}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용을 입력하세요"
                    rows={10}
                    required
                />
            </div>

            <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    취소
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '작성 중...' : '작성하기'}
                </Button>
            </div>
        </form>
    );
}
