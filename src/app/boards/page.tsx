'use client';

import BoardsListUI from '@/components/boardsList/list';
import { IBoardData } from '@/app/types/IBoarData';
import { FETCH_BOARDS } from '@/commons/queries/fetchBoards';
import { useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import Pagination from '@/components/boardsList/pagination';
import InfiniteScroll from '@/components/boardsList/InfiniteScroll';
import useSearchComponent from '@/components/boardsList/search/hook';
import SearchComponent from '@/components/boardsList/search/index';
import useBoardsList from '@/components/boardsList/list/hook';
import { useLoadStore } from '@/commons/store/useLoadStore';

export default function BoardsListPage(): JSX.Element {
    const [data, setData] = useState<IBoardData[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobileOrTablet, setIsMobileOrTable] = useState(false);
    const { isLoading } = useLoadStore();
    const {
        search,
        handleOnChangeSearch,
        onClickSearch,
        handleOnDateChange,
        refetch,
    } = useSearchComponent();
    const { setPage } = useBoardsList();

    const {
        fetchMore,
        data: initialData,
        loading,
        error,
    } = useQuery(FETCH_BOARDS, {
        variables: { page: currentPage, search },
    });

    useEffect(() => {
        const handleResize = () => setIsMobileOrTable(window.innerWidth < 1024);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (initialData) {
            console.log('initialData:', initialData);
            setData(initialData.fetchBoards);
            setTotalItems(initialData.fetchBoardsCount || 0);
            setHasMore(initialData.fetchBoards.length === 10);
        }
    }, [initialData]);

    const handlePageChange = async (newPage: number) => {
        setPage(newPage);
        await refetch({ page: newPage });
    };

    const loadMore = async () => {
        if (loading || !hasMore) return;

        const nextPage = currentPage + 1;
        try {
            const { data: newBoards } = await fetchMore({
                variables: { page: nextPage },
            });

            if (newBoards.fetchBoards.length === 0) {
                setHasMore(false);
            } else {
                setData((prevData) => [...prevData, ...newBoards.fetchBoards]);
                setCurrentPage(nextPage);
            }
        } catch (error) {
            console.error('로드 오류:', error);
        }
    };
    return (
        <>
            <SearchComponent
                onClickSearch={onClickSearch}
                handleOnChangeSearch={handleOnChangeSearch}
                handleOnDateChange={handleOnDateChange}
            />
            <BoardsListUI />
            {isMobileOrTablet ? (
                <InfiniteScroll
                    onLoadMore={loadMore}
                    hasMore={hasMore}
                    loading={isLoading}
                />
            ) : (
                <Pagination
                    totalItems={totalItems}
                    currentPage={currentPage}
                    pageSize={10}
                    onPageChange={handlePageChange}
                />
            )}
        </>
    );
}
