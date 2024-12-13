/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { IUploadProps } from '@/app/types/IUploadProps';
import styles from '@/components/boardsWrite/styles.module.css';
import Image from 'next/image';
import useImgUpload from './hook';
import { useEffect } from 'react';

const ImgUploadUI = ({ onImagesUpload, initialImages }: IUploadProps) => {
    const {
        fileRef,
        hoveredIndex,
        setHoveredIndex,
        handleOnChangeImg,
        handleOnClickImage,
        handleDeleteImage,
        images,
    } = useImgUpload({ onImagesUpload, initialImages });

    useEffect(() => {
        if (initialImages.length > 0) {
            onImagesUpload(initialImages);
        }
    }, [initialImages, onImagesUpload]);

    return (
        <>
            <div className={styles.imgCard} onClick={handleOnClickImage}>
                {images.length > 0 ? (
                    images.map((image, index) => (
                        <div
                            key={index}
                            className={styles.imagePreview}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <Image
                                src={`https://storage.googleapis.com/${image}`}
                                alt={`Uploaded preview ${index}`}
                                width={140}
                                height={160}
                                style={{
                                    objectFit: 'cover',
                                }}
                            />
                            {hoveredIndex === index && (
                                <button
                                    onClick={() => handleDeleteImage(index)}
                                    className={styles.deleteButton}
                                ></button>
                            )}
                        </div>
                    ))
                ) : (
                    <div>
                        <div className={styles.uploadText}>+</div>
                        <div className={styles.uploadText}>
                            클릭해서 사진업로드
                        </div>
                    </div>
                )}
                <input
                    type="file"
                    onChange={handleOnChangeImg}
                    style={{ display: 'none' }}
                    ref={fileRef}
                    multiple
                />
            </div>
        </>
    );
};

export default ImgUploadUI;
