import { NextResponse } from "next/server";
import { withPantallasCors } from "@/lib/pantallas/cors";

export async function GET() {
  return NextResponse.json({ ping: "pong" }, { headers: withPantallasCors() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: withPantallasCors() });
}
