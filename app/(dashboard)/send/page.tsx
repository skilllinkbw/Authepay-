"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Mail, Phone, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

/**
 * Send money UI.
 *
 * The browser never touches balances: this form posts to /api/transfers and
 * the server performs the atomic wallet-to-wallet movement. The success state
 * only appears once the backend confirms the transaction reference.
 */
export default function SendMoneyPage() {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState("");

  // One idempotency key per submission attempt so a retry cannot double-send.
  const [idempotencyKey] = useState(() =>
    (globalThis.crypto?.randomUUID?.() ?? `send-${Date.now()}-${Math.random()}`).replace(/-/g, "")
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setReference(null);

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          recipient_email: recipientEmail || undefined,
          recipient_phone: recipientEmail ? undefined : recipientPhone,
          amount,
          description: description || undefined,
        }),
      });
      const json = (await res.json()) as {
        data?: { transaction?: { reference?: string } };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message ?? "Transfer failed");
      } else {
        setReference(json.data?.transaction?.reference ?? null);
      }
    } catch {
      setError("Network error - please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-authepay-black">Send Money</h1>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
        </CardHeader>
        <CardContent>
          {reference && (
            <div className="bg-green-50 text-authepay-green p-4 rounded-xl flex items-start gap-3 mb-4">
              <CheckCircle2 size={20} />
              <span className="font-medium">Transfer confirmed. Reference {reference}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 flex items-start gap-3">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {!recipientEmail && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">or Recipient Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    placeholder="+267 7X XXX XXX"
                    value={recipientPhone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipientPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (BWP)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  className="pl-10"
                  maxLength={280}
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