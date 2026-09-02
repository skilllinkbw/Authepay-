import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { formatMinorAmount, formatDate } from "@/lib/utils";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: wallet } = await supabase
    .from("wallets")
    .select("id")
    .eq("owner_type", "user")
    .eq("owner_id", user.id)
    .maybeSingle();

  // RLS restricts rows to transactions touching the caller's wallets.
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // Direction is derived from which wallet is the FROM side (money out) vs the
  // TO side (money in) for THIS user's wallet. Never guess from a non-null id.
  const walletId = wallet?.id ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-authepay-black">Transactions</h1>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!walletId ? (
            <p className="p-8 text-center text-gray-400">No wallet found for this account.</p>
          ) : transactions && transactions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {transactions.map((t) => {
                const incoming = t.to_wallet_id === walletId && t.from_wallet_id !== walletId;
                const settled = t.status === "succeeded" || t.status === "refunded";
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 md:p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        incoming ? "bg-green-100 text-authepay-green" : "bg-red-100 text-red-600"
                      }`}>
                        {incoming ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-authepay-black capitalize">
                          {t.description || t.type}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            settled
                              ? "bg-green-100 text-authepay-green"
                              : t.status === "pending" || t.status === "processing"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-600"
                          }`}>
                            {t.status}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(t.created_at)}</span>
                          <span className="font-mono text-[10px] text-gray-300">{t.reference}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`font-bold ${incoming ? "text-authepay-green" : "text-red-600"}`}>
                      {incoming ? "+" : "-"}
                      {formatMinorAmount(t.amount_minor, t.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Receipt size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 font-medium">No transactions yet</p>
              <p className="text-gray-400 text-sm mt-1">Your transaction history will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}