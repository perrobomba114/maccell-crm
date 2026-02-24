import { getTokenUsage } from "@/lib/cerebro-token-tracker";

export const dynamic = 'force-dynamic';

export async function GET() {
    const usage = getTokenUsage();
    return Response.json(usage);
}
