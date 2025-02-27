import { useState, useEffect } from 'react';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CheerMessageForm } from './CheerMessageForm';
import { CheerMessageList } from './CheerMessageList';

export interface CheerMessage {
    id: string;
    userId: string;
    userNickname: string;
    message: string;
    createdAt: Date;
    likes: number;
    likedBy?: string[];
}

export function CheerMessageBoard() {
    const [messages, setMessages] = useState<CheerMessage[]>([]);

    useEffect(() => {
        if (!db) return;

        const cheerRef = collection(db, 'cheer_messages');
        const q = query(cheerRef, orderBy('createdAt', 'desc'), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(
                (doc) =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    } as CheerMessage)
            );
            setMessages(newMessages);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
                <h2 className="font-semibold text-xl mb-2">
                    🎉 응원 메시지 이벤트
                </h2>
                <p className="text-gray-700">
                    가장 창의적이고 열정 넘치는 응원 메시지를 남겨주세요! 매주
                    베스트 응원러를 선정하여 특별한 상품을 드립니다.
                </p>
            </div>

            <CheerMessageForm />
            <CheerMessageList messages={messages} />
        </div>
    );
}
