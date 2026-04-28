import { NextRequest, NextResponse } from "next/server";
import { withPantallasCors } from "@/lib/pantallas/cors";
import {
  ensurePantallasSchema,
  getContentsForToday,
  getScreenForDevice,
  touchScreenHeartbeat,
} from "@/lib/pantallas/repository";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let id = "";
  let key = "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    id = String(body?.id ?? "");
    key = String(body?.key ?? "");
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData().catch(() => null);
    id = String(form?.get("id") ?? "");
    key = String(form?.get("key") ?? "");
  }

  id = (id || request.nextUrl.searchParams.get("id") || "").trim();
  key = (key || request.nextUrl.searchParams.get("key") || "").trim();

  if (!id || !key) {
    return NextResponse.json({ error: 400, msg: "BAD REQUEST" }, { status: 400, headers: withPantallasCors() });
  }

  await ensurePantallasSchema();
  const screen = await getScreenForDevice(id);

  if (!screen) {
    return NextResponse.json({ error: 404, msg: "Not found" }, { headers: withPantallasCors() });
  }

  if (!screen.clave || screen.clave !== key) {
    return NextResponse.json({ error: 253, msg: "Bad key" }, { headers: withPantallasCors() });
  }

  await touchScreenHeartbeat(id);
  const data = (await getContentsForToday(id)).map((item) =>
    item.startsWith("http://") || item.startsWith("https://")
      ? item
      : `${request.nextUrl.origin}${item}`
  );

  return NextResponse.json(
    {
      data,
      setup: {
        duracion: screen.duracion,
        clave: screen.clave,
      },
    },
    { headers: withPantallasCors() }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: withPantallasCors() });
}
