import { DashboardNav } from "@/components/dashboard-nav";
import { PolicyGate } from "@/components/policy-gate";
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
    <div className="flex min-h-[calc(100vh-72px)] flex-col lg:flex-row">
      <DashboardNav />
      <main className="flex-1 p-4 md:p-8 bg-gray-50">
        <PolicyGate>{children}</PolicyGate>
      </main>
    </div>
  );
}
