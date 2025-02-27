import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { Input } from '../ui/input/Input';
import { Button } from '../ui/button/Button';

export function CheerMessageForm() {
    const { user } = useAuthStore();
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const MAX_LENGTH = 30;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const singleLineValue = value.replace(/[\r\n]+/g, '');
        if (singleLineValue.length <= MAX_LENGTH) {
            setMessage(singleLineValue);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !message.trim() || isLoading) return;
        if (message.includes('\n')) return; // 줄바꿈 체크

        setIsLoading(true);
        try {
            if (!db) return;

            await addDoc(collection(db, 'cheer_messages'), {
                userId: user.uid,
                userNickname: user.displayName || '익명의 팬',
                message: message.trim(),
                createdAt: serverTimestamp(),
                likes: 0,
                likeBy: [],
            });
            setMessage('');
        } catch (error) {
            console.error('Error adding message:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex gap-2">
                <Input
                    type="text"
                    value={message}
                    onChange={handleInputChange}
                    placeholder={`응원 메시지를 입력해주세요 (최대 ${MAX_LENGTH}자)`}
                    maxLength={MAX_LENGTH}
                    className="flex-1 p-3 border rounded-lg"
                />
                <Button
                    type="submit"
                    disabled={
                        isLoading ||
                        !message.trim() ||
                        message.length > MAX_LENGTH ||
                        !user
                    }
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
                >
                    {isLoading ? '전송 중...' : '응원하기'}
                </Button>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                    {!user && '응원 메시지를 남기려면 로그인이 필요합니다.'}
                </span>
                <span
                    className={`text-right ${
                        message.length > MAX_LENGTH * 0.8
                            ? 'text-orange-500'
                            : 'text-gray-500'
                    }`}
                >
                    {message.length} / {MAX_LENGTH}자
                </span>
            </div>
        </form>
    );
}
