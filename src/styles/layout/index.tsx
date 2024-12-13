'use client';

import React, { ReactNode } from 'react';
import Carousel from './banner/carousel';
import Footer from './footer';
import Header from './header/header';
import { usePathname } from 'next/navigation';
import BoardsListUI from '@/components/boardsList/list';
import styles from './layout.module.css';
import SearchComponent from '@/components/boardsList/search';
import useSearchComponent from '@/components/boardsList/search/hook';

interface ILayoutProps {
    children: ReactNode;
}

export default function LayoutComponent({ children }: ILayoutProps) {
    const pathname = usePathname();

    const isHomePage = pathname === '/';
    const isBoardPage = pathname === '/boards';

    const {
        search,
        handleOnChangeSearch,
        onClickSearch,
        handleOnDateChange,
        selectedDate,
    } = useSearchComponent();

    return (
        <>
            <div className={styles.layout}>
                <Header />
                {(isHomePage || isBoardPage) && (
                    <>
                        <div className={styles.section}>
                            <Carousel />
                        </div>
                        <div className={styles.searchSection}>
                            <SearchComponent
                                onClickSearch={onClickSearch}
                                handleOnChangeSearch={handleOnChangeSearch}
                                handleOnDateChange={handleOnDateChange}
                            />
                        </div>
                    </>
                )}
                {isHomePage ? (
                    <div className={styles.section}>
                        <BoardsListUI
                            data={[]}
                            loading={false}
                            error={undefined}
                        />
                    </div>
                ) : (
                    <div className={styles.section}>{children}</div>
                )}
                <Footer />
            </div>
        </>
    );
}
