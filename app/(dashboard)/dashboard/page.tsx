import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get wallet
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user?.id)
    .single();

  // Get recent transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const balance = wallet?.balance || 0;

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
            <div className="text-3xl font-black">{formatCurrency(balance)}</div>
            <p className="text-white/60 text-sm mt-1">Available for withdrawal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-500 text-sm font-medium flex items-center gap-2">
              <ArrowDownRight size={16} className="text-authepay-green" /> Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-authepay-black">
              {formatCurrency(
                transactions
                  ?.filter((t) => t.type === "receive" || t.type === "payment")
                  .reduce((sum, t) => sum + t.amount, 0) || 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-500 text-sm font-medium flex items-center gap-2">
              <ArrowUpRight size={16} className="text-red-500" /> Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-authepay-black">
              {formatCurrency(
                transactions
                  ?.filter((t) => t.type === "send" || t.type === "withdrawal")
                  .reduce((sum, t) => sum + t.amount, 0) || 0
              )}
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
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      t.type === "receive" || t.type === "payment"
                        ? "bg-green-100 text-authepay-green"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {t.type === "receive" || t.type === "payment" ? (
                        <ArrowDownRight size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-authepay-black capitalize">{t.description || t.type}</p>
                      <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${
                    t.type === "receive" || t.type === "payment"
                      ? "text-authepay-green"
                      : "text-red-600"
                  }`}>
                    {t.type === "receive" || t.type === "payment" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
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
