export const checkFileValidation = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
        alert('용량이 큼');
        return false;
    }
    if (!file.type.includes('jpeg') && !file.type.includes('png')) {
        alert('업로드 가능');
        return false;
    }

    return true;
};
