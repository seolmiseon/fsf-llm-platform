/* eslint-disable @typescript-eslint/no-explicit-any */
import { IBoardComment } from '@/app/types/IBoardComment';
import { FETCH_BOARD_COMMENTS } from '@/commons/queries/fetchBoardComments';
import { ApolloQueryResult, useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function useCommentList() {
    const { boardId } = useParams();
    const [data, setData] = useState<IBoardComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const resBoardId = Array.isArray(boardId) ? boardId[0] : boardId;

    const handleFetchComments = (result: ApolloQueryResult<any>) => {
        if (result?.data?.fetchBoardComments) {
            setData(result.data.fetchBoardComments);
            setHasMore(result.data.fetchBoardComments.length === 10);
        } else {
            setData([]);
            setHasMore(false);
        }
    };

    const { refetch } = useQuery(FETCH_BOARD_COMMENTS, {
        variables: { boardId: resBoardId },
        skip: true,
        onCompleted: (result) => handleFetchComments(result),
    });

    const fetchComments = async (): Promise<void> => {
        setLoading(true);
        try {
            const result = await refetch({ boardId: resBoardId });
            handleFetchComments(result);
        } catch (error) {
            console.error('댓글 로드 중 오류 발생:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (resBoardId) {
            fetchComments();
        }
    }, [resBoardId]);

    return {
        boardId,
        data,
        loading,
        hasMore,
        fetchComments,
    };
}
