'use client';

import { Pagination as AntPagination } from 'antd';
import styles from '../list/styles.module.css';

interface IPaginationProps {
    totalItems: number;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({
    totalItems,
    currentPage,
    pageSize,
    onPageChange,
}: IPaginationProps) {
    return (
        <>
            <div className={styles.paginationContainer}>
                <AntPagination
                    total={totalItems}
                    current={currentPage}
                    pageSize={pageSize}
                    showSizeChanger={false}
                    onChange={onPageChange}
                    showTotal={(total, range) =>
                        `${range[0]}-${range[1]} of ${total} items`
                    }
                />
            </div>
        </>
    );
}
