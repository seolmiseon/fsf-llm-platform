import { HomeBanner } from '@/components/home/HomeBanner';
import { LeagueGrid } from '@/components/client-components/league/LeagueGrid';
import { LiveMatches } from '@/components/client-components/match/LiveMatches';
import styles from './styles.module.css';

export default function HomePage() {
    return (
        <main className="flex min-h-screen flex-col">
            <div className={styles.homeContainer}>
                <HomeBanner />{' '}
            </div>
            <section className="py-16">
                <div className="max-w-7xl mx-auto  px-4 sm:px-6">
                    {' '}
                    <LeagueGrid />{' '}
                </div>
            </section>
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto  px-4 sm:px-6">
                    <h2 className="text-2xl font-bold mb-8">Live Matches</h2>
                    <LiveMatches />
                </div>
            </section>
        </main>
    );
}
