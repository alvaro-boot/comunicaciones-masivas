import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SettingsApp from "./settings-app";

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/");
  return <SettingsApp user={user} />;
}
