'use client';

import React, { useCallback, useEffect, useRef } from 'react';

interface IInfiniteScrollProps {
    onLoadMore: () => Promise<void>;
    hasMore: boolean;
    loading: boolean;
    children?: React.ReactNode;
}

const InfiniteScroll: React.FC<IInfiniteScrollProps> = ({
    onLoadMore,
    hasMore,
    loading,
    children,
}) => {
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const handleLoadMore = useCallback(() => {
        if (!loading && hasMore) {
            onLoadMore();
        }
    }, [loading, hasMore, onLoadMore]);

    useEffect(() => {
        const handleObserver: IntersectionObserverCallback = (entries) => {
            const target: IntersectionObserverEntry = entries[0];
            if (target.isIntersecting && !loading) {
                handleLoadMore();
            }
        };

        const observer = new IntersectionObserver(handleObserver, {
            rootMargin: '20px',
        });

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => {
            observer?.disconnect();
        };
    }, [handleLoadMore]);

    return (
        <div>
            {children}

            <div ref={loadMoreRef}>{loading && <p>Loading...</p>}</div>
        </div>
    );
};

export default InfiniteScroll;
