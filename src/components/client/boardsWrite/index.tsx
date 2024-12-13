/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React from 'react';

import styles from './styles.module.css';
import Address from '@/components/address/page';
import Button from '@/components/button/page';
import HrLine from '@/components/hrLine/page';
import ImgUpload from '@/components/imageUpload';
import Youtube from '@/components/youtube';
import { useBoardsNew } from './hook';
import { useYoutube } from '../youtube/hook';
import LoadingSpinner from './loadingSpinner';
import { useBoardStore } from '@/commons/store/useBoardStore';

const BoardsNewUI: React.FC<{ isEdit: boolean }> = ({ isEdit }) => {
    const { inputs, resetForm, uploadImages, addUploadImages } =
        useBoardStore();
    const { errorAlert, handleSubmit, handleInputChange, loading, isActive } =
        useBoardsNew(isEdit);
    const { handleVideoSelect } = useYoutube();

    return (
        <>
            <div className={styles.container}>
                <h2>{isEdit ? 'Edit Board' : 'Create New Board'}</h2>
                {errorAlert && <p style={{ color: 'red' }}>{errorAlert}</p>}
                <div style={{ border: 'none' }}>
                    <legend className={styles.legend}>게시물 등록</legend>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.formControl}>
                            <div className={styles.formContent}>
                                <label htmlFor="writer">작성자</label>
                                <input
                                    type="text"
                                    id="writer"
                                    className={styles.writer}
                                    value={inputs.writer}
                                    onChange={handleInputChange}
                                    placeholder="작성자명을 입력해주세요"
                                    autoComplete="name"
                                />
                            </div>
                            <div className={styles.formContent}>
                                <label htmlFor="password">비밀번호</label>
                                <input
                                    id="password"
                                    type="password"
                                    className={styles.password}
                                    value={inputs.password}
                                    onChange={handleInputChange}
                                    placeholder="비밀번호를 입력해주세요"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                        <HrLine />
                        <div className={styles.formContent}>
                            <label htmlFor="title">제목</label>
                            <input
                                id="title"
                                type="text"
                                value={inputs.title}
                                className={styles.title}
                                onChange={handleInputChange}
                                placeholder="제목을 입력해주세요"
                                autoComplete="title"
                            />
                        </div>
                        <HrLine />

                        <div className={styles.formContent}>
                            <label htmlFor="contents">내용</label>
                            <textarea
                                id="contents"
                                className={styles.content}
                                value={inputs.contents}
                                onChange={handleInputChange}
                                placeholder="내용을 입력해주세요"
                                autoComplete="contents"
                            ></textarea>
                        </div>
                        <Address />
                        <HrLine />
                        <Youtube
                            onVideoSelect={handleVideoSelect}
                            videoId={''}
                        />
                        <HrLine />
                        <ImgUpload
                            onImagesUpload={(image) => addUploadImages(image)}
                            initialImages={uploadImages}
                        />
                        {loading ? (
                            <LoadingSpinner />
                        ) : (
                            <Button
                                onSubmit={handleSubmit}
                                onReset={resetForm}
                                isDisabled={loading || !isActive}
                                isEdit={isEdit}
                                style={{
                                    backgroundColor: isActive
                                        ? '#2974E5'
                                        : '#CCCCCC',
                                }}
                            />
                        )}
                    </form>
                </div>
            </div>
        </>
    );
};
export default BoardsNewUI;
