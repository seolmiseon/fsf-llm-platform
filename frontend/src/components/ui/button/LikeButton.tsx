import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface LikeButtonProps {
    itemId: string;
    itemType: 'post' | 'message';
    initialLikes: number;
    isLiked?: boolean;
    onToggle?: (id: string, newStatus: boolean) => Promise<void>;
}

export function LikeButton({
    itemId,
    // itemType,
    initialLikes,
    isLiked = false,
    onToggle,
}: LikeButtonProps) {
    const [liked, setLiked] = useState(isLiked);
    const [likeCount, setLikeCount] = useState(initialLikes);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuthStore();

    useEffect(() => {
        setLiked(isLiked);
        setLikeCount(initialLikes);
    }, [isLiked, initialLikes]);

    const handleToggle = async () => {
        if (!user || isLoading) return;

        setIsLoading(true);

        try {
            // 미리 UI 업데이트
            const newLikedState = !liked;
            setLiked(newLikedState);
            setLikeCount((prev) => (newLikedState ? prev + 1 : prev - 1));

            // 콜백이 있으면 호출
            if (onToggle) {
                await onToggle(itemId, newLikedState);
            }
        } catch (error) {
            console.error('Like toggle failed:', error);
            setLiked(liked);
            setLikeCount(likeCount);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading || !user}
            className={`flex items-center gap-1 ${
                liked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'
            } transition-colors`}
        >
            {liked ? '❤️' : '🤍'} {likeCount}
        </button>
    );
}
