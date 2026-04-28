import { getUserData } from "@/actions/get-user";
import { PantallasClient } from "@/components/admin/pantallas-client";
import { ensurePantallasSchema, listScreens } from "@/lib/pantallas/repository";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPantallasPage() {
  const user = await getUserData();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  await ensurePantallasSchema();
  const screens = await listScreens();

  return <PantallasClient initialScreens={screens} />;
}
