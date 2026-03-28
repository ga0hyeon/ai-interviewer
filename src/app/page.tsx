import { redirect } from "next/navigation";
import { getCurrentUser, getRoleHomePath } from "@/lib/server/auth";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(getRoleHomePath(user.role));
}

