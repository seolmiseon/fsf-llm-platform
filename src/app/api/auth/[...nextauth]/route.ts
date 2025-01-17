import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
const { GET, POST } = handler;

export { GET, POST };
