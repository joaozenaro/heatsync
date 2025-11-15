import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Providers } from "./providers";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect("/auth/login");
  }

  const user = {
    name: userData.user.user_metadata?.name || userData.user.email,
    email: userData.user.email || "",
    avatar: userData.user.user_metadata?.avatar_url || "",
  };

  return <Providers user={user}>{children}</Providers>;
}
