import { toZonedTime, fromZonedTime } from "date-fns-tz";

const ARG_TZ = "America/Argentina/Buenos_Aires";

export class BusinessHoursService {
    // Schedule: Mon(1)-Sat(6): 09:00-13:00, 17:00-21:00
    // Sun(0): Closed

    addBusinessMinutes(startDate: Date, minutesToAdd: number): Date {
        // Force the input date to be treated as if it were in Argentina Time
        let currentDate = toZonedTime(startDate, ARG_TZ);
        let minutesRemaining = minutesToAdd;

        // Safety break to prevent infinite loops in case of bugs
        let iterations = 0;
        const MAX_ITERATIONS = 100000;

        while (minutesRemaining > 0 && iterations < MAX_ITERATIONS) {
            iterations++;

            if (this.isSunday(currentDate)) {
                currentDate = this.jumpToNextDayStart(currentDate);
                continue;
            }

            const currentHour = currentDate.getHours();
            const currentMinute = currentDate.getMinutes();
            const currentTime = currentHour * 60 + currentMinute;

            // Define blocks in minutes from midnight
            const block1Start = 9 * 60;        // 09:00 -> 540
            const block1End = 13 * 60;         // 13:00 -> 780
            const block2Start = 17 * 60;       // 17:00 -> 1020
            const block2End = 21 * 60;         // 21:00 -> 1260

            let minutesAvailableInBlock = 0;
            let currentBlockEnd = 0;

            if (currentTime >= block1Start && currentTime < block1End) {
                // Inside Block 1
                minutesAvailableInBlock = block1End - currentTime;
                currentBlockEnd = block1End;
            } else if (currentTime >= block2Start && currentTime < block2End) {
                // Inside Block 2
                minutesAvailableInBlock = block2End - currentTime;
                currentBlockEnd = block2End;
            } else {
                // Outside working hours
                if (currentTime < block1Start) {
                    // Before morning block -> Jump to 9:00
                    currentDate.setHours(9, 0, 0, 0);
                } else if (currentTime >= block1End && currentTime < block2Start) {
                    // Siesta time -> Jump to 17:00
                    currentDate.setHours(17, 0, 0, 0);
                } else {
                    // After evening block -> Jump to next day 9:00
                    currentDate = this.jumpToNextDayStart(currentDate);
                }
                continue; // Re-evaluate in new time
            }

            // consuming minutes
            if (minutesRemaining <= minutesAvailableInBlock) {
                currentDate.setMinutes(currentDate.getMinutes() + minutesRemaining);
                minutesRemaining = 0;
            } else {
                // Consume rest of block and continue
                currentDate.setMinutes(currentDate.getMinutes() + minutesAvailableInBlock);
                minutesRemaining -= minutesAvailableInBlock;

                // Although we are mathematically at block end, forcing loop to re-eval logic 
                // will handle the "jump to next block" cleanly. 
                // We add 1 second to ensure we don't get stuck exactly at block end if logic uses strict operators?
                // Actually my logic above `currentTime < block1End` handles strict inequality.
                // If I set time to 13:00, next loop `currentTime` is 780. `780 < 780` is false.
                // It falls to `else` (Outside working hours). 
                // `currentTime >= 780` (True) AND `currentTime < 1020` (True) -> Siesta -> Jumps to 17:00. Correct.
            }
        }

        // Convert the final zoned time back to a standard Date object
        return fromZonedTime(currentDate, ARG_TZ);
    }

    private isSunday(date: Date): boolean {
        return date.getDay() === 0;
    }

    private jumpToNextDayStart(date: Date): Date {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        nextDay.setHours(9, 0, 0, 0);
        return nextDay;
    }

    getCurrentTime(): Date {
        return toZonedTime(new Date(), ARG_TZ);
    }
    calculateBusinessMinutes(from: Date, to: Date): number {
        if (from >= to) return 0;

        let minutes = 0;
        let current = toZonedTime(from, ARG_TZ);
        const targetTo = toZonedTime(to, ARG_TZ);

        // Safety break
        let iterations = 0;
        const MAX_ITERATIONS = 100000;

        while (current < targetTo && iterations < MAX_ITERATIONS) {
            iterations++;

            // If Sunday, skip to Monday 9:00
            if (this.isSunday(current)) {
                current = this.jumpToNextDayStart(current);
                continue;
            }

            // If it's past target, break
            if (current >= targetTo) break;

            const currentHour = current.getHours();
            const currentMinute = current.getMinutes();
            const currentTime = currentHour * 60 + currentMinute;

            // Define blocks
            const block1Start = 9 * 60;   // 540
            const block1End = 13 * 60;    // 780
            const block2Start = 17 * 60;  // 1020
            const block2End = 21 * 60;    // 1260

            // If outside hours, jump
            if (currentTime < block1Start) {
                current.setHours(9, 0, 0, 0);
                continue;
            }
            if (currentTime >= block1End && currentTime < block2Start) {
                current.setHours(17, 0, 0, 0);
                continue;
            }
            if (currentTime >= block2End) {
                current = this.jumpToNextDayStart(current);
                continue;
            }

            // We are inside a block.
            // Determine end of this contagious block (either block end or 'to' date)
            let blockEnd = 0;
            if (currentTime < block1End) blockEnd = block1End;
            else blockEnd = block2End;

            // Check if 'to' is earlier than block end on the same day
            const toHour = targetTo.getHours();
            const toMinute = targetTo.getMinutes();
            const toTime = toHour * 60 + toMinute;

            // Check if 'to' is on the same day
            const isSameDay = current.getDate() === targetTo.getDate() &&
                current.getMonth() === targetTo.getMonth() &&
                current.getFullYear() === targetTo.getFullYear();

            let effectiveEnd = blockEnd;
            if (isSameDay && toTime < blockEnd) {
                effectiveEnd = toTime;
            }

            const diff = effectiveEnd - currentTime;
            if (diff > 0) {
                minutes += diff;
                current.setMinutes(current.getMinutes() + diff);
            } else {
                // Should not happen if logic is correct, but safety to move forward
                current.setMinutes(current.getMinutes() + 1);
            }
        }

        return minutes;
    }
}

export const businessHoursService = new BusinessHoursService();
