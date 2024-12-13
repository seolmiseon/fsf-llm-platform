import { IUploadProps } from '@/app/types/IUploadProps';
import { checkFileValidation } from '@/commons/libraries/FileValidation';
import { UPLOAD_FILE } from '@/commons/queries/upload';
import { useBoardStore } from '@/commons/store/useBoardStore';
import { useMutation } from '@apollo/client';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

const useImgUpload = ({ onImagesUpload, initialImages }: IUploadProps) => {
    const { uploadImages, addUploadImages, removeUploadImage, setError } =
        useBoardStore();
    const fileRef = useRef<HTMLInputElement>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [uploadFile] = useMutation(UPLOAD_FILE);
    const [images, setImages] = useState<string[]>(initialImages);

    useEffect(() => {
        setImages(initialImages);
    }, [initialImages]);

    const handleOnChangeImg = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        console.log(file, '있니없니');
        if (!file) return;

        // 임시 URL생성(가짜를 내브라우저(localhost:3000)에서 접근하게끔)
        const temporaryUrl = URL.createObjectURL(file);
        setImages((prevImages) => [...prevImages, temporaryUrl]);
        onImagesUpload([...uploadImages, temporaryUrl]);

        // // 임시URL생성(진짜를 가져오되 다른브라우저에서도가능하지만 용량이 크다)
        // const fileReader = new FileReader();
        // fileReader.readAsDataURL(file);

        // fileReader.onload = (e) => {
        //     const temporaryUrl = e.target?.result as string;

        //     setImages((prevImages) => [...prevImages, temporaryUrl]);
        //     onImagesUpload([...uploadImages, temporaryUrl]);
        // };

        // 파일업로드 시작
        try {
            const result = await uploadFile({
                variables: { file: file },
            });
            const uploadUrl = result.data?.uploadFile?.url;

            if (uploadUrl) {
                addUploadImages(uploadUrl);

                // setImages((prevImages) => [...prevImages, uploadUrl]);
                setImages((prevImages) => {
                    const updatedImages = prevImages.map((img) =>
                        img === temporaryUrl ? uploadUrl : img
                    );
                    onImagesUpload(updatedImages);
                    return updatedImages;
                });
            }
        } catch (error) {
            setError('업로드 실패');
            console.error('업로드실패', error);
        }
    };

    const handleOnClickImage = () => {
        fileRef.current?.click();
    };

    const handleDeleteImage = (index: number) => {
        const updatedImages = images.filter((_, i) => i !== index);
        setImages(updatedImages);
        removeUploadImage(index);
        onImagesUpload(updatedImages);
    };

    return {
        fileRef,
        hoveredIndex,
        setHoveredIndex,
        handleOnChangeImg,
        handleOnClickImage,
        handleDeleteImage,
        images,
    };
};
export default useImgUpload;
