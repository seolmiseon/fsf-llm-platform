import { useState } from 'react';
import { CheerMessage } from './CheerMessageBoard';
import { LikeButton } from '../ui/button/LikeButton';

interface MessageItemProps {
    message: CheerMessage;
    formatDate: (createdAt: any) => string;
    currentUserId?: string;
}

export function MessageItem({
    message,
    formatDate,
    currentUserId,
}: MessageItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLongMessage = message.message.length > 100;

    // 메시지 내용 처리 - 긴 메시지는 처음에 축소된 상태로 표시
    const displayMessage =
        isLongMessage && !isExpanded
            ? `${message.message.substring(0, 100)}...`
            : message.message;

    // 내가 작성한 메시지인지 확인
    const isMyMessage = currentUserId === message.userId;

    return (
        <div
            className={`p-4 rounded-lg shadow-sm border transition-shadow hover:shadow-md ${
                isMyMessage ? 'bg-blue-50 border-blue-100' : 'bg-white'
            }`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="font-medium">
                    {message.userNickname || '익명의 팬'}
                </span>
                <span className="text-sm text-gray-500">
                    {formatDate(message.createdAt)}
                </span>
            </div>

            <p className="text-gray-700 whitespace-pre-line">
                {displayMessage}
            </p>

            {isLongMessage && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-blue-500 mt-1"
                >
                    {isExpanded ? '접기' : '더 보기'}
                </button>
            )}

            <div className="mt-3 flex justify-between items-center">
                <LikeButton
                    itemId={message.id}
                    itemType="message"
                    initialLikes={message.likes || 0}
                    isLiked={message.likedBy?.includes(currentUserId || '')}
                />

                {isMyMessage && (
                    <div className="text-xs text-gray-400">
                        내가 작성한 메시지
                    </div>
                )}
            </div>
        </div>
    );
}
