/* eslint-disable react-hooks/exhaustive-deps */

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { useEffect } from 'react';
import { FETCH_BOARD } from '@/commons/queries/fetchBoard';
import { useYoutube } from '@/components/youtube/hook';

export const useBoardsDetail = () => {
    const router = useRouter();
    const { boardId } = useParams();
    const { handleVideoSelect } = useYoutube();
    const { data, loading, error } = useQuery(FETCH_BOARD, {
        variables: { boardId: boardId },
    });

    useEffect(() => {
        if (data?.fetchBoard) {
            const boardData = data.fetchBoard;
            handleVideoSelect(boardData.youtubeUrl);
            const uploadImages = boardData.images;
            console.log(uploadImages);
        }
    }, [data, handleVideoSelect]);

    const handleOnClickList = () => {
        console.log('boards list');
        router.replace('/boards/');
    };

    if (!boardId) {
        console.error('boardId가 없습니다.');
    }

    return {
        boardId,
        data,
        loading,
        error,
        handleOnClickList,
    };
};
