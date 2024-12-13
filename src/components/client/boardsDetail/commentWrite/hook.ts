import { useMutation } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, useState } from 'react';
import {
    CreateBoardCommentDocument,
    FetchBoardCommentsDocument,
} from '@/commons/graphql/graphql';
import useBoardRating from '@/components/rating/hook';

export default function useCommentWrite() {
    const { boardId } = useParams();
    const router = useRouter();
    const { rating } = useBoardRating();
    const [commentInput, setCommentInput] = useState({
        writer: '',
        password: '',
        contents: '',
    });
    const [errorAlert, setErrorAlert] = useState('');
    const [isActive, setIsActive] = useState<boolean>(false);

    const [createBoardComment] = useMutation(CreateBoardCommentDocument);

    const handleValidation = (): boolean => {
        const { writer, password, contents } = commentInput;
        if (!writer || !password || !contents) {
            setErrorAlert('필수등록 사항 입니다');
            setIsActive(false);
            return false;
        }
        setErrorAlert('');
        setIsActive(true);
        return true;
    };

    const handleCommentInputChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ): void => {
        const { id, value } = e.target;

        setCommentInput((prev) => ({
            ...prev,
            [id]: value,
        }));
        handleValidation();
    };

    const handleSubmit = async (): Promise<void> => {
        if (handleValidation()) {
            try {
                const result = await createBoardComment({
                    variables: {
                        createBoardCommentInput: {
                            ...commentInput,
                            rating: Number(rating),
                        },
                        boardId: String(boardId),
                    },
                    refetchQueries: [
                        {
                            query: FetchBoardCommentsDocument,
                            variables: {
                                boardId,
                            },
                        },
                    ],
                });
                console.log(result);
                router.push(`/boards/${boardId}`);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const resetForm = (): void => {
        setCommentInput({
            writer: '',
            contents: '',
            password: '',
        });
        setIsActive(false);
    };

    return {
        commentInput,
        handleSubmit,
        handleCommentInputChange,
        resetForm,
        errorAlert,
        isActive,
    };
}
