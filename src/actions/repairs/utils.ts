"use server";

import { businessHoursService } from "@/lib/services/business-hours";

export async function calculatePromisedDateAction(startDateIso: string, minutesToAdd: number) {
    const startDate = new Date(startDateIso);
    const newDate = businessHoursService.addBusinessMinutes(startDate, minutesToAdd);
    return newDate.toISOString();
}
