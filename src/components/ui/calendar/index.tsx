// Calendar.tsx
import styles from './calendar.module.css';
import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/utils/cn';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
    className,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn(styles.calendar, className)}
            classNames={{
                months: styles.months,
                month: 'space-y-4',
                caption: styles.header,
                caption_label: 'text-sm font-medium',
                nav: 'flex items-center space-x-1',
                nav_button: styles.navigationButton,
                nav_button_previous: styles.previous,
                nav_button_next: styles.next,
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex justify-between',
                head_cell:
                    'text-muted-foreground w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: styles.cell,
                day: styles.day,
                day_selected: styles.selected,
                day_today: styles.today,
                day_outside: styles.outside,
                day_range_middle: styles.rangeMiddle,
            }}
            {...props}
        />
    );
}
