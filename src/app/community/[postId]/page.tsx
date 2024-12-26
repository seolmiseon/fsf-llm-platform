'use client';

import { FETCH_BOARD } from '@/commons/queries/fetchBoard';
import BoardsDetailUI from '@/components/boardsDetail/detail';
import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';

export default function BoardsDetailPage(): JSX.Element {
    const { boardId } = useParams();
    console.log();

    const { data, loading, error } = useQuery(FETCH_BOARD, {
        variables: {
            boardId: boardId,
        },
        fetchPolicy: 'cache-first',
    });

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    const { fetchBoard } = data || {};
    if (!fetchBoard) {
        return <p>No board data available.</p>;
    }
    return (
        <>
            <BoardsDetailUI />
        </>
    );
}
