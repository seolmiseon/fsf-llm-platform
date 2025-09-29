import { CheerMessage } from './CheerMessageBoard';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { useAuthStore } from '@/store/useAuthStore';
import { MessageItem } from './MessageItem';

interface CheerMessageListProps {
    messages: CheerMessage[];
}

export function CheerMessageList({ messages }: CheerMessageListProps) {
    const { user } = useAuthStore();

    if (messages.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                첫 응원 메시지를 남겨보세요!
            </div>
        );
    }

    const formatMessageDate = (createdAt: any) => {
        if (!createdAt) return '';

        try {
            // Firestore Timestamp 객체인 경우
            if (
                createdAt instanceof Timestamp ||
                typeof createdAt.toDate === 'function'
            ) {
                return formatDistanceToNow(createdAt.toDate(), {
                    addSuffix: true,
                    locale: ko,
                });
            }

            // 이미 Date 객체인 경우
            if (createdAt instanceof Date) {
                return formatDistanceToNow(createdAt, {
                    addSuffix: true,
                    locale: ko,
                });
            }

            // 날짜 문자열이나 숫자인 경우
            return formatDistanceToNow(new Date(createdAt), {
                addSuffix: true,
                locale: ko,
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return '';
        }
    };

    return (
        <div className="space-y-4">
            {messages.map((msg) => (
                <MessageItem
                    key={msg.id}
                    message={msg}
                    formatDate={formatMessageDate}
                    currentUserId={user?.uid}
                />
            ))}
        </div>
    );
}
