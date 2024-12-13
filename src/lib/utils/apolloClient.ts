import {
    ApolloClient,
    InMemoryCache,
    ApolloLink,
    HttpLink,
} from '@apollo/client';

export const FetchUserClient = new ApolloClient({
    link: new HttpLink({
        uri: 'http://main-practice.codebootcamp.co.kr/graphql',
        credentials: 'include',
    }),
    cache: new InMemoryCache(),
});
