import { NextRequest, NextResponse } from "next/server";
import { withPantallasCors } from "@/lib/pantallas/cors";
import { ensurePantallasSchema, registerScreenForDevice } from "@/lib/pantallas/repository";

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
  try {
    const registration = await registerScreenForDevice(id);
    if (registration.alreadyLinked) {
      return NextResponse.json(
        { error: 409, msg: "Pantalla ya vinculada" },
        { status: 409, headers: withPantallasCors() }
      );
    }

    return NextResponse.json({ error: 0, key: registration.key, msg: "OK" }, { headers: withPantallasCors() });
  } catch (error) {
    if (error instanceof Error && error.message === "SCREEN_NOT_FOUND") {
      return NextResponse.json({ error: 404, msg: "Not found" }, { status: 404, headers: withPantallasCors() });
    }

    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: withPantallasCors() });
}
