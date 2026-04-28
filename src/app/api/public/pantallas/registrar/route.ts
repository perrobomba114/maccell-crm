import { NextRequest, NextResponse } from "next/server";
import { withPantallasCors } from "@/lib/pantallas/cors";
import { ensurePantallasSchema, getScreenForDevice, regenerateScreenKey } from "@/lib/pantallas/repository";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let id: string | undefined;

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    id = body?.id;
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData().catch(() => null);
    id = form ? String(form.get("id") ?? "") : undefined;
  }

  id = (id || request.nextUrl.searchParams.get("id") || "").trim();

  if (!id) {
    return NextResponse.json({ error: 400, msg: "BAD REQUEST" }, { status: 400, headers: withPantallasCors() });
  }

  await ensurePantallasSchema();
  const screen = await getScreenForDevice(id);
  if (!screen) {
    return NextResponse.json({ error: 404, msg: "Not found" }, { headers: withPantallasCors() });
  }
  const key = await regenerateScreenKey(id);
  return NextResponse.json({ error: 0, key, msg: "OK" }, { headers: withPantallasCors() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: withPantallasCors() });
}
