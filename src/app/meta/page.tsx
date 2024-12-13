import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Create Next App',
    description: 'Welcome',
};

export default function Page({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
