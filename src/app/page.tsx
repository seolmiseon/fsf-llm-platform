import { HomeBanner } from '@/components/banner/HomeBanner';
import { LeagueGrid } from '@/components/league/LeagueGrid';
import { LiveMatches } from '@/components/match/live/LiveMatches';
// import styles from './styles.module.css';

export default function HomePage() {
    return (
        <div>
            <HomeBanner />
            <main className="max-w-7xl mx-auto  py-8">
                <section>
                    <LeagueGrid />
                </section>
                <section className="mt-8">
                    <h2 className="text-2xl font-bold mb-6">Live Matches</h2>
                    <LiveMatches />
                </section>
            </main>
        </div>
    );
}
