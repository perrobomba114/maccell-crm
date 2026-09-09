import { getCurrentUser } from "@/actions/auth-actions";
import { canUseCerebroV2 } from "@/lib/cerebro-v2/access";
import { createRepairEvidenceHandler } from "@/lib/cerebro-v2/repair-evidence-handler";
import { readCitedRepairEvidence } from "@/lib/cerebro-v2/repair-evidence-store";

export const dynamic = "force-dynamic";

export const GET = createRepairEvidenceHandler({
    getUser: getCurrentUser,
    canUse: canUseCerebroV2,
    readEvidence: readCitedRepairEvidence,
});
