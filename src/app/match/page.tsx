'use client';

import MatchCalendar from '@/components/match/card/MatchCalendar';
import MatchList from '@/components/match/card/MatchList';
import { useState } from 'react';

export default function MatchPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
    };

    return (
        <div className="container mx-auto p-4 space-y-6">
            <MatchCalendar onDateSelect={handleDateSelect} />
            <MatchList selectedDate={selectedDate} />
        </div>
    );
}
