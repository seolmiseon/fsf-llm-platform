import { useState } from 'react';

interface AsyncState {
    loading: boolean;
    error: string;
}

export function useAsync<T>() {
    const [state, setState] = useState<AsyncState>({
        loading: false,
        error: '',
    });

    const runAsync = async (asyncFC: () => Promise<T>) => {
        setState({ loading: true, error: '' });
        try {
            const result = await asyncFC();
            return result;
        } catch (error: any) {
            setState((prev) => ({ ...prev, error: error.message }));
            throw error;
        } finally {
            setState((prev) => ({ ...prev, loading: false }));
        }
    };

    return {
        ...state,
        runAsync,
    };
}
