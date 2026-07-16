"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Send, User, Phone, FileText, CheckCircle } from "lucide-react";

export default function SendMoneyPage() {
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    // Get sender wallet
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const numAmount = parseFloat(amount);
    if (!wallet || wallet.balance < numAmount) {
      setError("Insufficient balance");
      setLoading(false);
      return;
    }

    // Deduct from sender
    await supabase
      .from("wallets")
      .update({ balance: wallet.balance - numAmount })
      .eq("id", wallet.id);

    // Create transaction
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "send",
      amount: numAmount,
      currency: "BWP",
      description: description || `Sent to ${recipientName}`,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      status: "completed",
    });

    if (txError) {
      setError(txError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setRecipientName("");
    setRecipientPhone("");
    setAmount("");
    setDescription("");
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-authepay-black">Send Money</h1>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="bg-green-50 text-authepay-green p-4 rounded-xl flex items-center gap-3 mb-4">
              <CheckCircle size={20} />
              <span className="font-medium">Money sent successfully!</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="John Doe"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="+267 76 749 821"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (BWP)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Payment for services"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" isLoading={loading}>
              <Send size={18} /> Send Money
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
