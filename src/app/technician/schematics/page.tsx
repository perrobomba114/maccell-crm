import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth-actions";
import { readCatalog } from "@/lib/schematics/catalog";
import { SchematicsWorkbench } from "@/components/schematics/workbench";
import { paginateCatalog } from "@/lib/schematics/search";

export const dynamic = "force-dynamic";

export default async function SchematicsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["TECHNICIAN", "ADMIN"].includes(user.role)) redirect("/");
  const catalog = await readCatalog();
  return <SchematicsWorkbench initial={paginateCatalog(catalog.assets, { kind: "all", page: 1, pageSize: 40 })} userId={user.id} canEditIdentity={user.role === "ADMIN"} />;
}
