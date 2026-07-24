import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <LoginForm />;
}
