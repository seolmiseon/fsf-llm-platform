import { DeleteBoardDocument } from '@/commons/graphql/graphql';
import { FETCH_BOARDS } from '@/commons/queries/fetchBoards';
import { useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IBoardResponse } from '@/app/types/IBoarData';

export default function useBoardsList() {
    const router = useRouter();
    const [page, setPage] = useState(1); // 현재 페이지 상태
    const [pageSize, setPageSize] = useState(10); // 페이지당 아이템 수 상태

    const { data, loading, error } = useQuery<IBoardResponse>(FETCH_BOARDS, {
        variables: { page },
        notifyOnNetworkStatusChange: true,
    });
    const [deleteBoard] = useMutation(DeleteBoardDocument);

    const handleOnClick = (_id: string) => {
        router.push(`/boards/${_id}`);
    };

    const handleOnClickDelete = async (
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        try {
            await deleteBoard({
                variables: { boardId: String(e.currentTarget.id) },
                refetchQueries: [{ query: FETCH_BOARDS }],
            });
        } catch (error) {
            console.log('삭제오류', error);
        }
    };

    return {
        data,
        loading,
        error,
        setPage,
        pageSize,
        handleOnClick,
        handleOnClickDelete,
    };
}
