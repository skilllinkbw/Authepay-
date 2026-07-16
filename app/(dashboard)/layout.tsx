import { DashboardNav } from "@/components/dashboard-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)]">
      <DashboardNav />
      <main className="flex-1 lg:ml-64 p-6 md:p-8 bg-gray-50">{children}</main>
    </div>
  );
}
