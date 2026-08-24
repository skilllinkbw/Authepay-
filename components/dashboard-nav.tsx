"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet as WalletIcon,
  Send,
  Receipt,
  Store,
  KeyRound,
  Bell,
  Shield,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
  { href: "/send", label: "Send", icon: Send },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/merchants", label: "Merchants", icon: Store },
  { href: "/developer", label: "Developers", icon: KeyRound },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/admin", label: "Admin", icon: Shield },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white">
      <div className="flex flex-row gap-1 overflow-x-auto p-3 lg:flex-col lg:gap-1 lg:p-4">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-authepay-navy text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={signOut}
          className="mt-0 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 lg:mt-auto"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </nav>
  );
}
