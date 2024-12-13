'use client';

import { UPDATE_BOARD_COMMENT } from '@/commons/queries/updateBoardComment';
import { useMutation } from '@apollo/client';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import useCommentWrite from '../commentWrite/hook';

export default function EditIcon() {
    const router = useRouter();
    const { boardCommentId } = useParams();
    const { commentInput } = useCommentWrite();

    const [updateBoardComment] = useMutation(UPDATE_BOARD_COMMENT);

    const handleEditOnClick = async () => {
        try {
            await updateBoardComment({
                variables: {
                    boardCommentId,
                    password: commentInput.password,
                    updateBoardCommentInput: {
                        contents: commentInput.contents,
                        rating: 5,
                    },
                },
            });
            router.push(`/commentWrite/${boardCommentId}`);
        } catch (error) {
            console.error('업뎃수정이안된다', error);
        }
    };
    return (
        <>
            <button onClick={handleEditOnClick}>
                <Image
                    src="/images/edit.png"
                    alt="수정하기"
                    width={20}
                    height={20}
                />
            </button>
        </>
    );
}
