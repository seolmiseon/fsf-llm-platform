'use client';

import { ChangeEvent, useEffect } from 'react';
import usePostCode from '../daumPostcode/hook';
import styles from '@/components/boardsWrite/styles.module.css';

const Address = () => {
    const { boardAddress, setBoardAddress, handlePostCodeSearch } =
        usePostCode();

    useEffect(() => {
        if (boardAddress.zipcode) {
            setBoardAddress((prev) => ({
                ...prev,
                zipcode: boardAddress.zipcode,
            }));
        }
    }, [boardAddress.zipcode]);

    const handleBoardInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = event.target;
        setBoardAddress((prev) => ({
            ...prev,
            [id === 'addressInput' ? 'address' : 'addressDetail']: value,
        }));
    };

    return (
        <>
            <div className={styles.formContent}>
                <div className={styles.titleAdd}>주소</div>
                <div className={styles.addressSearch}>
                    <input
                        type="text"
                        id="number"
                        className={styles.number}
                        placeholder="01234"
                        value={boardAddress.zipcode}
                        readOnly
                    />
                    <button
                        type="button"
                        id="postCode"
                        className={styles.postCode}
                        onClick={handlePostCodeSearch}
                    >
                        우편번호 검색
                    </button>
                </div>
                <div className={styles.inputBox}>
                    <input
                        id="addressInput"
                        className={styles.addressInput}
                        type="text"
                        placeholder="주소를 입력해주세요"
                        value={boardAddress.address}
                        onChange={handleBoardInputChange}
                    />
                    <input
                        id="detailAddressInput"
                        className={styles.detailAddressInput}
                        type="text"
                        placeholder="상세주소"
                        value={boardAddress.addressDetail}
                        onChange={handleBoardInputChange}
                    />
                </div>
            </div>
        </>
    );
};

export default Address;
