'use client';

import { SearchResponse, SearchResult } from '@/types/ui/search';
import _ from 'lodash';
import { getAuth } from 'firebase/auth';
import { useCallback, useState } from 'react';

export function useServerSearch() {
    const auth = getAuth();
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const performSearch = useCallback(
        async (query: string, page: number): Promise<SearchResponse> => {
            try {
                const token = await auth.currentUser?.getIdToken(true);
                const response = await fetch(
                    `/api/search?q=${encodeURIComponent(query)}&page=${page}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            } catch (error) {
                console.error('Search error:', error);
                throw error;
            }
        },
        [auth]
    );

    const handleSearchWithCache = useCallback(
        async (query: string, page: number) => {
            const cacheKey = `${query}_page${page}`;
            const cached = getCacheResult(cacheKey);

            if (cached) {
                setResults(cached.results);
                setHasMore(cached.hasMore);
                return;
            }

            try {
                setLoading(true);
                const response = await performSearch(query, page);
                console.log('Search response:', response);
                if (response?.results) {
                    setResults(response.results);
                    setHasMore(response.pagination.hasMore);

                    // 결과를 캐시에 저장
                    cacheResults(cacheKey, {
                        results: response.results,
                        hasMore: response.pagination.hasMore,
                    });
                }
            } catch (error) {
                console.error('오류발생:', error);
                setError('검색중 오류가 생겼습니다.');
            } finally {
                setLoading(false);
            }
        },
        [performSearch]
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debounceInitialSearch = useCallback(
        _.debounce(async (query: string) => {
            setCurrentPage(1);
            await handleSearchWithCache(query, 1);
        }, 300),
        [handleSearchWithCache]
    );

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            handleSearchWithCache(search, nextPage);
        }
    }, [loading, hasMore, currentPage, search, handleSearchWithCache]);

    const getCacheResult = (query: string) => {
        const cache = JSON.parse(localStorage.getItem('searchCache') || '{}');
        const cachedData = cache[query];

        // 캐시가 30분 이내인 경우에만 사용
        if (cachedData && Date.now() - cachedData.timestamp < 30 * 60 * 1000) {
            return cachedData;
        }
        return null;
    };

    const cacheResults = (
        query: string,
        data: { results: SearchResult[]; hasMore: boolean }
    ) => {
        try {
            const cache = JSON.parse(
                localStorage.getItem('searchCache') || '{}'
            );
            cache[query] = {
                results: data.results,
                hasMore: data.hasMore,
                timestamp: Date.now(),
            };
            localStorage.setItem('searchCache', JSON.stringify(cache));
        } catch (error) {
            console.error('Cache error:', error);
        }
    };

    const handleSearch = useCallback(
        (newSearch: string) => {
            setSearch(newSearch);
            setSelectedIndex(-1);

            if (newSearch.trim()) {
                setLoading(true);
                debounceInitialSearch(newSearch);
            } else {
                setResults([]);
                setHasMore(false);
            }
        },
        [debounceInitialSearch]
    );

    return {
        search,
        results,
        loading,
        error,
        hasMore,
        currentPage,
        handleSearch,
        handleSearchWithCache,
        loadMore,
        selectedIndex,
    };
}
