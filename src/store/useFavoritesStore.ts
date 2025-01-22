// import { create } from 'zustand';
// import { persist } from 'zustand/middleware';

// interface FavoritesStore {
//     favorites: {
//         teamIds: string[];
//         playerIds: string[];
//     };
//     addTeam: (teamId: string) => void;
//     removeTeam: (teamId: string) => void;
//     addPlayer: (playerId: string) => void;
//     removePlayer: (playerId: string) => void;
// }

// export const useFavoritesStore = create<FavoritesStore>()(
//     persist(
//         (set) => ({
//             favorites: {
//                 teamIds: [],
//                 playerIds: [],
//             },
//             addTeam: (teamId) =>
//                 set((state) => ({
//                     favorites: {
//                         ...state.favorites,
//                         teamIds: [...state.favorites.teamIds, teamId],
//                     },
//                 })),
//             removeTeam: (teamId) =>
//                 set((state) => ({
//                     favorites: {
//                         ...state.favorites,
//                         teamIds: state.favorites.teamIds.filter(
//                             (id) => id !== teamId
//                         ),
//                     },
//                 })),
//             // 선수 관련 함수들도 비슷한 방식으로...
//         }),
//         {
//             name: 'user-favorites', // localStorage에 저장될 키 이름
//         }
//     )
// );
