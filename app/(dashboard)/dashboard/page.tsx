import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { formatMinorAmount, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // RLS restricts these reads to the caller's own rows.
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("owner_type", "user")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  // Totals are computed from the COMPLETE ledger (append-only, per-wallet),
  // never from a truncated subset of transactions.
  const { data: ledger } = wallet
    ? await supabase
        .from("ledger_entries")
        .select("direction, amount_minor")
        .eq("wallet_id", wallet.id)
    : { data: [] };

  const balance = wallet?.balance_minor ?? 0;
  const currency = wallet?.currency ?? "BWP";

  const totalIn = (ledger ?? [])
    .filter((e) => e.direction === "credit")
    .reduce((sum, e) => sum + e.amount_minor, 0);
  const totalOut = (ledger ?? [])
    .filter((e) => e.direction === "debit")
    .reduce((sum, e) => sum + e.amount_minor, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-authepay-black">Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-authepay-blue to-blue-700 text-white border-0">
          <CardHeader>
            <CardTitle className="text-white/80 text-sm font-medium flex items-center gap-2">
              <Wallet size={16} /> Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{formatMinorAmount(balance, currency)}</div>
            <p className="text-white/60 text-sm mt-1">Available balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-500 text-sm font-medium flex items-center gap-2">
              <ArrowDownRight size={16} className="text-authepay-green" /> Total In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-authepay-black">
              {formatMinorAmount(totalIn, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-500 text-sm font-medium flex items-center gap-2">
              <ArrowUpRight size={16} className="text-red-500" /> Total Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-authepay-black">
              {formatMinorAmount(totalOut, currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Link href="/transactions" className="text-sm text-authepay-blue font-medium hover:underline">
            View All
          </Link>
        </CardHeader>
        <CardContent>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((t) => {
                const incoming = t.to_wallet_id === wallet?.id;
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        incoming ? "bg-green-100 text-authepay-green" : "bg-red-100 text-red-600"
                      }`}>
                        {incoming ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-authepay-black capitalize">
                          {t.description || t.type}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(t.created_at)}</p>
                      </div>
                    </div>
                    <span className={`font-bold ${incoming ? "text-authepay-green" : "text-red-600"}`}>
                      {incoming ? "+" : "-"}
                      {formatMinorAmount(t.amount_minor, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Receipt size={32} className="mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}