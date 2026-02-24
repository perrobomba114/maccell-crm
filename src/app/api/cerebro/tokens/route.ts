import { getTokenUsage } from "@/lib/cerebro-token-tracker";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const usage = await getTokenUsage();
    return NextResponse.json(usage);
}
