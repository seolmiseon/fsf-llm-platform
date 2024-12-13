import { userStore } from '../store/userStore';
import { FETCH_USER_LOGGED_IN } from '../queries/fetchUserLoggedIn';
import { FetchUserClient } from './apolloClient';

export const fetchUser = async (accessToken: string) => {
    try {
        const { data } = await FetchUserClient.query({
            query: FETCH_USER_LOGGED_IN,
            context: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        });

        if (data?.fetchUserLoggedIn) {
            const user = data.fetchUserLoggedIn;
            userStore.getState().setUser(user, accessToken);
        }
    } catch (error) {
        console.error('Failed to fetch user:', error);
    }
};

//useMemo로 나만의 useCallBack 만들기
// const handleOnClickState2 = useMemo(() => {
//     return () => {
//         console.log(countState + 1);
//         setCountState(countState + 1;)
//     }
// },[]) // 메모리제이션의 함수안에 스테이트값이 있으면 그값또한 기억하게된다 하여 useCallback기능과 같다
