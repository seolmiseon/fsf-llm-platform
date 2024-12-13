import { useMutation, useQuery } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import {
    CreateBoardDocument,
    UpdateBoardDocument,
} from '@/commons/graphql/graphql';
import { FETCH_BOARD } from '@/commons/queries/fetchBoard';
import { useYoutube } from '../youtube/hook';
import usePostCode from '../daumPostcode/hook';
import { IUseBoardsNewProps } from '@/app/types/IUseBoardsNewProps';
import { useBoardStore } from '@/commons/store/useBoardStore';
import { IInputs } from '@/app/types/IStoreType';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useBoardsNew = (isEdit: boolean): IUseBoardsNewProps => {
    const router = useRouter();
    const { boardId } = useParams();
    const { boardAddress, setBoardAddress } = usePostCode();
    const { inputs, setInputs, resetForm, uploadImages, setUploadImages } =
        useBoardStore();
    const { selectedVideoId } = useYoutube();

    const [createBoard] = useMutation(CreateBoardDocument);
    const [updateBoard] = useMutation(UpdateBoardDocument);

    const [errorAlert, setErrorAlert] = useState<string | undefined>(undefined);
    const [isActive, setIsActive] = useState<boolean>(false);

    const { data, loading } = useQuery(FETCH_BOARD, {
        variables: { boardId: boardId },
        skip: !isEdit || !boardId,
    });

    useEffect(() => {
        if (data?.fetchBoard) {
            setInputs('writer', data.fetchBoard.writer ?? '');
            setInputs('title', data.fetchBoard.title ?? '');
            setInputs('contents', data.fetchBoard.contents ?? '');
            setInputs('password', '');

            const images = data.fetchBoard.images || [];
            images.forEach((image: string, index: number) => {
                setUploadImages(image, index);
            });
            console.log('패치데이터', data.fetchBoard);
        }
    }, [data?.fetchBoard]);

    const handleInputChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { id, value } = e.target;
        setInputs(id as keyof IInputs, value);
    };

    const handleSubmit = async (): Promise<void> => {
        if (!handleValidation()) return;

        try {
            if (!isEdit) {
                const result = await createBoard({
                    variables: {
                        createBoardInput: {
                            ...inputs,
                            youtubeUrl: selectedVideoId
                                ? `https://www.youtube.com/watch?v=${selectedVideoId}`
                                : null,
                            boardAddress: boardAddress.zipcode
                                ? boardAddress
                                : null,
                            images: uploadImages,
                        },
                    },
                });
                const createdBoardId = result.data?.createBoard?._id;
                if (createdBoardId) {
                    router.push(`/boards/${createdBoardId}`);
                }
            } else {
                const inputPassword = inputs.password;
                if (!inputPassword || inputPassword.trim() === '') {
                    setErrorAlert('비밀번호는 필수입니다');
                    return;
                }
                const result = await updateBoard({
                    variables: {
                        updateBoardInput: {
                            title: inputs.title,
                            contents: inputs.contents,
                            images: uploadImages,
                        },
                        password: inputPassword,
                        boardId: String(boardId),
                    },
                });

                if (result.data?.updateBoard) {
                    console.log('업데이트성공', result.data.updateBoard);
                    router.push(`/boards/${boardId}`);
                }
            }
        } catch (error) {
            console.error('업데이트오류', error);
            setErrorAlert(isEdit ? '업데이트오류' : '등록오류발생');
        }
    };

    function handleValidation(): boolean {
        const { writer, title, contents, password } = inputs;
        if (!writer || !title || !contents || !password) {
            setErrorAlert('필수등록 사항 입니다');
            setIsActive(false);
            return false;
        }
        setErrorAlert('');
        setIsActive(true);
        return true;
    }

    return {
        isEdit,
        inputs,
        handleInputChange,
        handleSubmit,
        resetForm,
        errorAlert,
        isActive,
        loading,
        uploadImages,
    };
};
