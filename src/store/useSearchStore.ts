import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchStore {
    recentSearches: string[];
    addSearch: (term: string) => void;
    removeSearch: (term: string) => void;
    clearSearches: () => void;
}

export const useSearchStore = create<SearchStore>()(
    persist(
        (set) => ({
            recentSearches: [],
            addSearch: (term) =>
                set((state) => ({
                    recentSearches: [
                        term,
                        ...state.recentSearches.filter((t) => t !== term),
                    ].slice(0, 10),
                })),
            removeSearch: (term) =>
                set((state) => ({
                    recentSearches: state.recentSearches.filter(
                        (t) => t !== term
                    ),
                })),
            clearSearches: () => set({ recentSearches: [] }),
        }),
        {
            name: 'search-history',
        }
    )
);
