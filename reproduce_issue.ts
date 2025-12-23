
// Mocking the BusinessHoursService logic to run standalone
class BusinessHoursService {
    // Schedule: Mon(1)-Sat(6): 09:00-13:00, 17:00-21:00
    // Sun(0): Closed

    addBusinessMinutes(startDate: Date, minutesToAdd: number): Date {
        let currentDate = new Date(startDate);
        let minutesRemaining = minutesToAdd;

        // Safety break to prevent infinite loops in case of bugs
        let iterations = 0;
        const MAX_ITERATIONS = 10000;

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
            // console.log(`Iter ${iterations}: Current ${currentDate.toLocaleTimeString()} (${currentTime}), Remaining ${minutesRemaining}, Available ${minutesAvailableInBlock}`);

            if (minutesRemaining <= minutesAvailableInBlock) {
                currentDate.setMinutes(currentDate.getMinutes() + minutesRemaining);
                minutesRemaining = 0;
            } else {
                // Consume rest of block and continue
                currentDate.setMinutes(currentDate.getMinutes() + minutesAvailableInBlock);
                minutesRemaining -= minutesAvailableInBlock;
            }
        }

        return currentDate;
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
}

const service = new BusinessHoursService();

function test(timeStr: string, minutes: number) {
    const now = new Date(timeStr);
    const result = service.addBusinessMinutes(now, minutes);
    console.log(`Start: ${now.toString()} + ${minutes}m => ${result.toString()}`);
}

// Assume today is NOT Sunday. Let's pick a weekday.
// User date: 2025-12-11 (Thursday)

console.log("--- TEST CASES ---");
test("2025-12-11T20:00:00", 60); // Should be 21:00 today
test("2025-12-11T21:00:00", 0);  // Should stay 21:00? Or jump?
test("2025-12-11T20:00:00", 61); // Should be 09:01 tomorrow?
test("2025-12-11T21:00:00", 60); // Should be 10:00 tomorrow?
