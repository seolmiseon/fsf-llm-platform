import '../styles/globals.css';
import localFont from 'next/font/local';
import LayoutComponent from '@/components/layout';

const pretendard = localFont({
    src: '../fonts/PretendardVariable.woff2',
    display: 'swap',
    weight: '100 900',
    variable: '--font-pretendard',
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${pretendard.variable} vsc-initialized`}>
                <LayoutComponent>{children}</LayoutComponent>
            </body>
        </html>
    );
}
