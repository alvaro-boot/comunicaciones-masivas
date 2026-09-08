import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SeguimientoApp from "./seguimiento-app";

export default async function SeguimientoPage() {
  const user = await getSession();
  if (!user) redirect("/");
  return (
    <Suspense fallback={null}>
      <SeguimientoApp user={user} />
    </Suspense>
  );
}
