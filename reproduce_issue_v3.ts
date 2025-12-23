
import { businessHoursService } from "./src/lib/services/business-hours";

// Simulation: 2025-12-12 16:55 (Thursday)
// Promised: 2025-12-12 10:00 (Overdue)
// Extend: 60 mins

const now = new Date("2025-12-12T16:55:00-03:00");
const promisedAt = new Date("2025-12-12T10:00:00-03:00");
const extendMinutes = 60;

console.log("--- DEBUG SIMULATION ---");
console.log("NOW:", now.toISOString());
console.log("PROMISED:", promisedAt.toISOString());

const isOverdue = now > promisedAt;
console.log("Is Overdue:", isOverdue);

const baseDate = isOverdue ? now : promisedAt;
console.log("Base Date for extension:", baseDate.toISOString());

// Calculate New Target
const newTarget = businessHoursService.addBusinessMinutes(baseDate, extendMinutes);
console.log("New Target Date:", newTarget.toISOString());

// Calculate Available
const available = businessHoursService.calculateBusinessMinutes(now, newTarget);
console.log("Available Minutes:", available);

if (available < 60) {
    console.error("FAIL: Available minutes is less than requested 60!");
} else {
    console.log("SUCCESS: Available minutes match extension.");
}
