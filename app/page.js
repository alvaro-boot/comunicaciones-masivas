import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AuthForm from "./auth-form";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/panel");
  return <AuthForm mode="login" />;
}
