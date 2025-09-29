import { db } from './client';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export async function getTeams(leagueId: string) {
    const teamsRef = collection(db, 'leagues', leagueId, 'teams');
    const snapshot = await getDocs(teamsRef);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}

export async function getTeamDetails(leagueId: string, teamId: string) {
    const teamRef = doc(db, 'leagueId', leagueId, 'teams', teamId);
    const snapshot = await getDoc(teamRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
