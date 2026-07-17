import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Receipt, Filter } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-authepay-black">Transactions</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-authepay-blue transition-colors">
          <Filter size={16} /> Filter
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          {transactions && transactions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 md:p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      t.type === "receive" || t.type === "payment" || t.type === "deposit"
                        ? "bg-green-100 text-authepay-green"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {t.type === "receive" || t.type === "payment" || t.type === "deposit" ? (
                        <ArrowDownRight size={20} />
                      ) : (
                        <ArrowUpRight size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-authepay-black capitalize">
                        {t.description || t.type}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          t.status === "completed"
                            ? "bg-green-100 text-authepay-green"
                            : t.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-600"
                        }`}>
                          {t.status}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(t.created_at)}</span>
                      </div>
                      {t.recipient_name && (
                        <p className="text-xs text-gray-400 mt-0.5">To: {t.recipient_name}</p>
                      )}
                    </div>
                  </div>
                  <span className={`font-bold ${
                    t.type === "receive" || t.type === "payment" || t.type === "deposit"
                      ? "text-authepay-green"
                      : "text-red-600"
                  }`}>
                    {t.type === "receive" || t.type === "payment" || t.type === "deposit" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
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
