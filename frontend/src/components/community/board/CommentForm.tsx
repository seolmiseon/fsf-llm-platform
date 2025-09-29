'use client';

import { Button } from '@/components/ui/button/Button';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';

interface CommentFormProps {
    postId: string;
}

export function CommentForm({ postId }: CommentFormProps) {
    const [content, setContent] = useState('');
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user || loading || !db) return;

        setLoading(true);
        setError(null);
        try {
            const commentRef = collection(db, 'community', postId, 'comments');
            await addDoc(commentRef, {
                content,
                authorId: user.uid,
                authorName: user.displayName,
                createdAt: serverTimestamp(),
            });
            setContent('');
        } catch (error) {
            console.log('Error adding comment:', error);
            setError('댓글 작성중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="text-center py-10">
                댓글작성시 로그인이 필요해요
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="text-center text-red-500 py-2">{error}</div>
            )}
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="댓글을 달아주세요"
                rows={3}
                disabled={loading}
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={loading || !content.trim()}>
                    {loading ? '등록중...' : '댓글 작성'}
                </Button>
            </div>
        </form>
    );
}
