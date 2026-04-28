import { NextResponse } from "next/server";
import { withPantallasCors } from "@/lib/pantallas/cors";
import { ensurePantallasSchema, listActiveScreensForDevice } from "@/lib/pantallas/repository";

export async function GET() {
  await ensurePantallasSchema();
  const data = await listActiveScreensForDevice();
  return NextResponse.json({ error: 0, data, msg: "OK" }, { headers: withPantallasCors() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: withPantallasCors() });
}
