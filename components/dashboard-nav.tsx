"use client";

import Link from "next/link";

export function DashboardNav() {
  return (
    <nav className="flex gap-4 p-4 border-b">
      <Link href="/dashboard">
        Dashboard
      </Link>

      <Link href="/dashboard/wallet">
        Wallet
      </Link>

      <Link href="/dashboard/send">
        Send
      </Link>

      <Link href="/dashboard/transactions">
        Transactions
      </Link>
    </nav>
  );
}
