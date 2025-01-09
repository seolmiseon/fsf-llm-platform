export const getDate = (date: string | Date) => {
    const _date = new Date(date);
    const yyyy = _date.getFullYear();
    const mm = String(_date.getMonth() + 1).padStart(2, '0');
    const dd = String(_date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const isSameDate = (
    date1: string | Date,
    date2: string | Date
): boolean => {
    return getDate(date1) === getDate(date2);
};
