import NextAuth, { DefaultSession } from 'next-auth';
import { TeamResponse } from '../api/responses';

declare module 'next-auth' {
    interface Session {
        user: {
            id?: string;
            email?: string;
            name?: string;
            image?: string;
            role?: 'user' | 'admin';
            password?: string;
            teams?: TeamResponse[];
        } & DefaultSession['user'];
    }

    interface User {
        id?: string;
        email?: string;
        name?: string;
        image?: string;
        role?: 'user' | 'admin';
        password?: string;
        teams?: TeamResponse[];
    }
}
