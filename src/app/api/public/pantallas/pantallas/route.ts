import { NextResponse } from "next/server";
import { ensurePantallasSchema, listActiveScreensForDevice } from "@/lib/pantallas/repository";

export async function GET() {
  await ensurePantallasSchema();
  const data = await listActiveScreensForDevice();
  return NextResponse.json({ error: 0, data, msg: "OK" });
}
