import { gql } from '@apollo/client';

export const FETCH_BOARDS_OF_MINE = gql`
    query {
        fetchBoardsOfMine {
            _id
            title
            contents
            likeCount
            dislikeCount
            createdAt
        }
    }
`;
