import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, ArrowDownToLine } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user?.id)
    .single();

  const balance = wallet?.balance || 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-authepay-black">My Wallet</h1>

      <Card className="bg-gradient-to-br from-authepay-blue to-blue-800 text-white border-0">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-white/70 text-sm">Available Balance</p>
                <p className="text-4xl font-black">{formatCurrency(balance)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/send">
              <Button className="bg-white text-authepay-blue hover:bg-gray-100">
                <Plus size={18} /> Send Money
              </Button>
            </Link>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <ArrowDownToLine size={18} /> Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Currency</span>
            <span className="font-semibold">BWP (Botswana Pula)</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Wallet ID</span>
            <span className="font-semibold font-mono text-sm">{wallet?.id?.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-authepay-green text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-authepay-green" /> Active
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
