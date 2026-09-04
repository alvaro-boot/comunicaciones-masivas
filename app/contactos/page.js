import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ContactosApp from "./contactos-app";

export default async function ContactosPage() {
  const user = await getSession();
  if (!user) redirect("/");
  return <ContactosApp user={user} />;
}
