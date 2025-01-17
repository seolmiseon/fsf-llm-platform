import { HomeBanner } from '@/components/home/HomeBanner';
import { LeagueGrid } from '@/components/league/LeagueGrid';
import { LiveMatches } from '@/components/match/live/LiveMatches';
// import styles from './styles.module.css';

export default function HomePage() {
    return (
        <div className="min-h-screen ">
            <HomeBanner />
            <main className="max-w-7xl mx-auto px-4 py-12">
                <section>
                    <LeagueGrid />
                </section>
                <section className="mt-12">
                    <h2 className="text-2xl font-bold mb-6">Live Matches</h2>
                    <LiveMatches />
                </section>
            </main>
        </div>
    );
}
