'use client';

import { FETCH_BOARDS_WITH_SEARCH } from '@/commons/queries/fetchBoardsWithSearch';
import { useQuery } from '@apollo/client';
import { ChangeEvent, useEffect, useState } from 'react';
import _ from 'lodash';
import { format } from 'date-fns';

export default function useSearchComponent() {
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const { refetch } = useQuery(FETCH_BOARDS_WITH_SEARCH);

    const debounceFetch = _.debounce(
        (searchGap, page) =>
            refetch({
                search: searchGap,
                page,
                date: selectedDate ? format(selectedDate, 'YYYY-MM-DD') : null,
            }),
        300
    );

    const handleOnChangeSearch = (e: ChangeEvent<HTMLInputElement>) => {
        setSearch(e.currentTarget.value);
        debounceFetch(e.currentTarget.value, 1);
    };

    const handleOnDateChange = (date: Date | null) => {
        setSelectedDate(date);
        debounceFetch(search, 1);
    };

    const onClickSearch = (page: number = 1) => {
        refetch({
            search,
            page,
            date: selectedDate ? format(selectedDate, 'YYYY,MM-DD') : null,
        });
    };

    useEffect(() => {
        return () => {
            debounceFetch.cancel();
        };
    }, []);

    return {
        search,
        handleOnChangeSearch,
        onClickSearch,
        handleOnDateChange,
        selectedDate,
        refetch,
    };
}
