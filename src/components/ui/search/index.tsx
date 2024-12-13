'use client';

import { DatePicker } from 'antd';
import styles from './search.module.css';

interface SearchComponentProps {
    onClickSearch: () => void;
    handleOnChangeSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleOnDateChange: (date: Date | null) => void;
}

const SearchComponent: React.FC<SearchComponentProps> = ({
    handleOnChangeSearch,
    onClickSearch,
    handleOnDateChange,
}) => {
    return (
        <>
            <div className={styles.searchBox}>
                <input
                    className={styles.searchInput}
                    type="text"
                    onChange={handleOnChangeSearch}
                />
                <button
                    className={styles.searchBtn}
                    onClick={() => onClickSearch()}
                >
                    검색
                </button>
            </div>
        </>
    );
};
export default SearchComponent;
