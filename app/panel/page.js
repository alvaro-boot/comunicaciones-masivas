import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PanelApp from "./panel-app";

export default async function PanelPage() {
  const user = await getSession();
  if (!user) redirect("/");
  return <PanelApp user={user} />;
}
