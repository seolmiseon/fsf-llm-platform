// import { create } from 'zustand';
// import { persist } from 'zustand/middleware';

// interface FavoritesStore {
//     favorites: {
//         playerIds: string[];
//     };
//     votedPlayers: string[];
//     addPlayer: (playerId: string) => void;
//     removePlayer: (playerId: string) => void;
//     addVote: (playerId: string) => void;
// }

// export const useFavoritesStore = create<FavoritesStore>()(
//     persist(
//         (set) => ({
//             favorites: {
//                 playerIds: [],
//             },
//             votedPlayers: [],
//             addPlayer: (playerId) =>
//                 set((state) => ({
//                     favorites: {
//                         ...state.favorites,
//                         playerIds: [...state.favorites.playerIds, playerId],
//                     },
//                 })),
//             removePlayer: (playerId) =>
//                 set((state) => ({
//                     favorites: {
//                         ...state.favorites,
//                         playerIds: state.favorites.playerIds.filter(
//                             (id) => id !== playerId
//                         ),
//                     },
//                 })),
//             addVote: (playerId) =>
//                 set((state) => ({
//                     ...state,
//                     votedPlayers: [...state.votedPlayers, playerId],
//                 })),
//         }),
//         {
//             name: 'user-favorites',
//         }
//     )
// );
