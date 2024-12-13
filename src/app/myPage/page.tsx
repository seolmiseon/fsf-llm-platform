'use client';

import { FETCH_BOARDS_OF_MINE } from '@/commons/queries/fetchBoardsOfMine';
import { FETCH_USER_LOGGED_IN } from '@/commons/queries/fetchUserLoggedIn';
import { getDate } from '@/commons/units/date';
import { useQuery } from '@apollo/client';
import { IBoardData } from '../types/IBoarData';
import { userStore } from '@/commons/store/userStore';

export interface IBoardOfMineResponse {
    fetchBoardsOfMine: IBoardData[];
}

export default function MyPage() {
    const { accessToken } = userStore();
    const {
        data: userData,
        loading: userLoading,
        error: userError,
    } = useQuery(FETCH_USER_LOGGED_IN, {
        fetchPolicy: 'network-only',
    });

    const {
        data: boardsData,
        loading,
        error: boardsError,
    } = useQuery<IBoardOfMineResponse>(FETCH_BOARDS_OF_MINE, {
        skip: !accessToken,
        fetchPolicy: 'no-cache',
    });
    console.log('User Loading:', userLoading);
    console.log('User Error:', userError);
    console.log('User Data:', userData);

    console.log('Boards Data:', boardsData);

    if (boardsError) console.error('Boards Error:', boardsError);

    return (
        <div>
            <h1>마이페이지</h1>

            {userData && (
                <div>
                    <p>이름: {userData.fetchUserLoggedIn.name}</p>
                    <p>이메일: {userData.fetchUserLoggedIn.email}</p>
                    {userData.fetchUserLoggedIn.picture && (
                        <img
                            src={userData.fetchUserLoggedIn.picture}
                            alt="Profile"
                        />
                    )}
                </div>
            )}

            {/* 사용자가 작성한 게시물 목록 */}
            <h2>내 게시물</h2>
            {boardsData && boardsData.fetchBoardsOfMine.length > 0 ? (
                boardsData.fetchBoardsOfMine.map((board: IBoardData) => (
                    <div key={board._id}>
                        <h3>{board.title}</h3>
                        <p>{board.contents}</p>
                        <p>좋아요 수: {board.likeCount}</p>
                        <p>화이팅 수: {board.dislikeCount}</p>
                        <p>작성일: {getDate(board.createdAt)}</p>
                    </div>
                ))
            ) : (
                <p>게시물이 없습니다.</p>
            )}
        </div>
    );
}
