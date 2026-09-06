import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminSchematicsPage() {
  redirect("/technician/schematics");
}
