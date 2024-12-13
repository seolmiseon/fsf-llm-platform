// 'use client';

// import {
//     ApolloClient,
//     ApolloLink,
//     ApolloProvider,
//     fromPromise,
//     InMemoryCache,
// } from '@apollo/client';
// import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';

// import { onError } from '@apollo/client/link/error';
// import { setContext } from '@apollo/client/link/context';
// import { useLoadStore } from '../store/useLoadStore';
// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { userStore } from '../store/userStore';

// const GLOBAL_STATE = new InMemoryCache();

// interface IApolloSetting {
//     children: React.ReactNode;
// }
// export default function ApolloSetting(props: IApolloSetting) {
//     const { accessToken, updateAccessToken } = userStore();
//     const { setIsLoading } = useLoadStore();

//     const router = useRouter();

//     useEffect(() => {
//         console.log('useEffect 실행됨');
//         setIsLoading(true);
//         getAccessToken()
//             .then((newToken) => {
//                 if (newToken)
//                     updateAccessToken(newToken);
//             })
//             .finally(() => setIsLoading(false));
//     }, []);

//     const getAccessToken = async (): Promise<string | undefined> => {
//         console.log('엑세스토큰 호출되었다');
//         try {
//             const response = await fetch(
//                 'http://main-practice.codebootcamp.co.kr/graphql',
//                 {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     credentials: 'include',
//                     body: JSON.stringify({
//                         query: `mutation restoreAccessToken { restoreAccessToken { accessToken } }`,
//                     }),
//                 }
//             );
//             console.log('서버응답이 왓는가?????', response.status);
//             const result = await response.json();
//             console.log('서버응답데이터', result);
//             if (result.errors) {
//                 console.error('서버 응답 에러 메시지:', result.errors);
//                 return;
//             }
//             const newAccessToken =
//                 result?.data?.restoreAccessToken?.accessToken;
//             if (newAccessToken) {
//                 console.log('새삥토큰', newAccessToken);
//                 updateAccessToken(newAccessToken);
//             } else {
//                 console.warn('갱신된 토큰아~~어디로갔니?');
//             }
//             return newAccessToken;
//         } catch (error) {
//             console.error('Error fetching access token:', error);
//         }
//     };
//     const authLink = setContext((_, { headers }) => {
//         console.log('현재 액세스 토큰:', accessToken);
//         return {
//             headers: {
//                 ...headers,
//                 Authorization: accessToken ? `Bearer ${accessToken}` : '',
//             },
//         };
//     });

//     const errorLink = onError(({ graphQLErrors, operation, forward }) => {
//         if (graphQLErrors) {
//             for (const err of graphQLErrors) {
//                 if (err.extensions?.code === 'UNAUTHENTICATED') {
//                     return fromPromise(
//                         getAccessToken().then((newToken) => {
//                             if (newToken) {
//                                 updateAccessToken(newToken);

//                                 operation.setContext({
//                                     headers: {
//                                         ...operation.getContext().headers,
//                                         Authorization: `Bearer ${
//                                             newToken ?? ''
//                                         }`,
//                                     },
//                                 });
//                                 return forward(operation);
//                             } else {
//                                 console.log(
//                                     '토큰 갱신 실패 - 로그인 페이지로 이동'
//                                 );
//                                 router.push('/login');
//                             }
//                         })
//                     ).flatMap(() => forward(operation));
//                 }
//             }
//         }
//     });

//     const uploadLink = createUploadLink({
//         uri: 'http://main-practice.codebootcamp.co.kr/graphql',

//         credentials: 'include',
//     });

//     const client = new ApolloClient({
//         link: ApolloLink.from([authLink, errorLink, uploadLink]),
//         cache: GLOBAL_STATE,
//         connectToDevTools: true,
//     });

//     return <ApolloProvider client={client}>{props.children}</ApolloProvider>;
// }
import {
    ApolloClient,
    ApolloLink,
    ApolloProvider,
    fromPromise,
    InMemoryCache,
    Observable,
} from '@apollo/client';
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';

import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { useLoadStore } from '../store/useLoadStore';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userStore } from '../store/userStore';

const GLOBAL_STATE = new InMemoryCache();

interface IApolloSetting {
    children: React.ReactNode;
}

export default function ApolloSetting(props: IApolloSetting) {
    const { accessToken, updateAccessToken } = userStore();
    const { setIsLoading } = useLoadStore();
    const router = useRouter();

    useEffect(() => {
        setIsLoading(true);
        getAccessToken()
            .then((newToken) => {
                if (newToken) updateAccessToken(newToken);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const getAccessToken = async (): Promise<string | undefined> => {
        try {
            const response = await fetch(
                'http://main-practice.codebootcamp.co.kr/graphql',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        query: `mutation restoreAccessToken { restoreAccessToken { accessToken } }`,
                    }),
                }
            );
            const result = await response.json();
            return result?.data?.restoreAccessToken?.accessToken;
        } catch (error) {
            console.error('토큰갱신에러:', error);
        }
    };

    const authLink = setContext((_, { headers }) => ({
        headers: {
            ...headers,
            Authorization: accessToken ? `Bearer ${accessToken}` : '',
        },
    }));

    const errorLink = onError(({ graphQLErrors, operation, forward }) => {
        if (graphQLErrors) {
            for (const err of graphQLErrors) {
                if (err.extensions?.code === 'UNAUTHENTICATED') {
                    return new Observable((observer) => {
                        getAccessToken()
                            .then((newToken) => {
                                if (newToken) {
                                    updateAccessToken(newToken);
                                    operation.setContext(
                                        ({ headers = {} }) => ({
                                            headers: {
                                                ...headers,
                                                Authorization: `Bearer ${newToken}`,
                                            },
                                        })
                                    );
                                    forward(operation).subscribe({
                                        next: observer.next.bind(observer),
                                        error: observer.error.bind(observer),
                                        complete:
                                            observer.complete.bind(observer),
                                    });
                                } else {
                                    router.push('/login');
                                    observer.complete();
                                }
                            })
                            .catch((error) => {
                                console.log('token refresh failed:', error);
                                observer.error(error);
                            });
                    });
                }
            }
        }
    });

    const uploadLink = createUploadLink({
        uri: 'http://main-practice.codebootcamp.co.kr/graphql',
        credentials: 'include',
    });

    const client = new ApolloClient({
        link: ApolloLink.from([authLink, errorLink, uploadLink]),
        cache: GLOBAL_STATE,
        connectToDevTools: true,
    });

    return <ApolloProvider client={client}>{props.children}</ApolloProvider>;
}
