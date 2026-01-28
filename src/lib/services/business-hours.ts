import { toZonedTime, fromZonedTime } from "date-fns-tz";

const ARG_TZ = "America/Argentina/Buenos_Aires";

export class BusinessHoursService {
    // Schedule: Mon(1)-Sat(6): 09:00-13:00, 17:00-21:00
    // Sun(0): Closed

    addBusinessMinutes(startDate: Date, minutesToAdd: number): Date {
        // "Proxy Date": A Date object where the UTC components match the Wall Time in ARG.
        // We must use UTC getters/setters on this object to perform "Face Value" math.
        let currentDate = toZonedTime(startDate, ARG_TZ);
        let minutesRemaining = minutesToAdd;

        // Safety break
        let iterations = 0;
        const MAX_ITERATIONS = 100000;

        while (minutesRemaining > 0 && iterations < MAX_ITERATIONS) {
            iterations++;

            if (this.isSunday(currentDate)) {
                currentDate = this.jumpToNextDayStart(currentDate);
                continue;
            }

            // USE UTC GETTERS for Proxy Date
            const currentHour = currentDate.getUTCHours();
            const currentMinute = currentDate.getUTCMinutes();
            const currentTime = currentHour * 60 + currentMinute;

            // Define blocks in minutes
            const block1Start = 9 * 60;        // 09:00 -> 540
            const block1End = 13 * 60;         // 13:00 -> 780
            const block2Start = 17 * 60;       // 17:00 -> 1020
            const block2End = 21 * 60;         // 21:00 -> 1260

            let minutesAvailableInBlock = 0;

            // Logic to determine if we are in a block or need to jump
            if (currentTime >= block1Start && currentTime < block1End) {
                // Inside Block 1
                minutesAvailableInBlock = block1End - currentTime;
            } else if (currentTime >= block2Start && currentTime < block2End) {
                // Inside Block 2
                minutesAvailableInBlock = block2End - currentTime;
            } else {
                // Outside working hours
                if (currentTime < block1Start) {
                    // Before morning block -> Jump to 9:00
                    currentDate.setUTCHours(9, 0, 0, 0);
                } else if (currentTime >= block1End && currentTime < block2Start) {
                    // Siesta time -> Jump to 17:00
                    currentDate.setUTCHours(17, 0, 0, 0);
                } else {
                    // After evening block -> Jump to next day 9:00
                    currentDate = this.jumpToNextDayStart(currentDate);
                }
                continue; // Re-evaluate in new time
            }

            // Consume minutes
            if (minutesRemaining <= minutesAvailableInBlock) {
                currentDate.setUTCMinutes(currentDate.getUTCMinutes() + minutesRemaining);
                minutesRemaining = 0;
            } else {
                // Consume rest of block and continue
                // We advance exactly to the end of the block
                currentDate.setUTCMinutes(currentDate.getUTCMinutes() + minutesAvailableInBlock);
                minutesRemaining -= minutesAvailableInBlock;

                // Logic will loop. Next iteration `currentTime` will be equal to blockEnd.
                // It will fall into "Outside working hours" -> "Siesta" or "Next Day".
            }
        }

        // Convert the final Proxy Date back to a real timestamp
        return fromZonedTime(currentDate, ARG_TZ);
    }

    private isSunday(date: Date): boolean {
        return date.getUTCDay() === 0; // UTC Day for Proxy Date
    }

    private jumpToNextDayStart(date: Date): Date {
        const nextDay = new Date(date);
        nextDay.setUTCDate(date.getUTCDate() + 1); // Helper to advance day safely
        nextDay.setUTCHours(9, 0, 0, 0);
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

        let iterations = 0;
        const MAX_ITERATIONS = 100000;

        while (current < targetTo && iterations < MAX_ITERATIONS) {
            iterations++;

            if (this.isSunday(current)) {
                current = this.jumpToNextDayStart(current);
                continue;
            }

            if (current >= targetTo) break;

            const currentHour = current.getUTCHours();
            const currentMinute = current.getUTCMinutes();
            const currentTime = currentHour * 60 + currentMinute;

            const block1Start = 9 * 60;
            const block1End = 13 * 60;
            const block2Start = 17 * 60;
            const block2End = 21 * 60;

            if (currentTime < block1Start) {
                current.setUTCHours(9, 0, 0, 0);
                continue;
            }
            if (currentTime >= block1End && currentTime < block2Start) {
                current.setUTCHours(17, 0, 0, 0);
                continue;
            }
            if (currentTime >= block2End) {
                current = this.jumpToNextDayStart(current);
                continue;
            }

            let blockEnd = 0;
            if (currentTime < block1End) blockEnd = block1End;
            else blockEnd = block2End;

            // Check if 'targetTo' is effective end
            const toHour = targetTo.getUTCHours();
            const toMinute = targetTo.getUTCMinutes();
            const toTime = toHour * 60 + toMinute;

            const isSameDay = current.getUTCDate() === targetTo.getUTCDate() &&
                current.getUTCMonth() === targetTo.getUTCMonth() &&
                current.getUTCFullYear() === targetTo.getUTCFullYear();

            let effectiveEnd = blockEnd;
            if (isSameDay && toTime < blockEnd) {
                effectiveEnd = toTime;
            }

            const diff = effectiveEnd - currentTime;
            if (diff > 0) {
                minutes += diff;
                current.setUTCMinutes(current.getUTCMinutes() + diff);
            } else {
                // Advance 1 min to avoid stuck loop if diff 0
                current.setUTCMinutes(current.getUTCMinutes() + 1);
            }
        }

        return minutes;
    }
}

export const businessHoursService = new BusinessHoursService();
