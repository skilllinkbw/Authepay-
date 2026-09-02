"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, AlertTriangle, Clock, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreatePaymentResponse {
  data?: {
    payment?: { reference?: string; status?: string };
    redirect_url?: string | null;
  };
  error?: { message?: string };
}

/**
 * Checkout — start a provider-backed payment into the caller's wallet.
 *
 * Never fabricates success: the success state only appears when the backend
 * returns a created payment, and final settlement is confirmed on the
 * dedicated /pay/[reference] status page (which polls the real API).
 */
export default function CheckoutPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<{ reference: string; status: string } | null>(null);

  // One idempotency key per logical submission. A retry after a network/5xx
  // failure reuses the key (safe); a new submission gets a new key.
  const newKey = () =>
    (globalThis.crypto?.randomUUID?.() ?? `pay-${Date.now()}-${Math.random()}`).replace(/-/g, "");
  const [idempotencyKey, setIdempotencyKey] = useState(() => newKey());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          amount,
          currency: "BWP",
          customer_phone: phone || undefined,
          description: description || undefined,
        }),
      });
      const json = (await res.json()) as CreatePaymentResponse;

      if (!res.ok) {
        setError(json.error?.message ?? "Could not start payment");
        if (res.status < 500) setIdempotencyKey(newKey());
        return;
      }

      const ref = json.data?.payment?.reference;
      const status = json.data?.payment?.status ?? "pending";
      if (!ref) {
        setError("Payment was created but no reference was returned.");
        setIdempotencyKey(newKey());
        return;
      }

      setPayment({ reference: ref, status });
      setIdempotencyKey(newKey()); // this submission is complete

      const redirect = json.data?.redirect_url;
      if (redirect) {
        // Real providers return a hosted checkout URL; send the customer there.
        window.location.assign(redirect);
      }
    } catch {
      // Network error: keep the same key so a retry is idempotent.
      setError("Network error - please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-authepay-black">
        <CreditCard size={22} /> Add money
      </h1>

      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600">
          <AlertTriangle size={18} /> <span>{error}</span>
        </div>
      )}

      {payment ? (
        <Card>
          <CardContent className="p-8 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-yellow-700">
              <Clock size={20} /> Payment pending
            </div>
            <p className="text-sm text-gray-600">
              Your payment request was created and sent to the provider. We will
              only credit your wallet once the provider confirms the payment.
            </p>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                Payment reference
              </p>
              <p className="font-mono text-sm break-all">{payment.reference}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => router.push(`/pay/${payment.reference}`)}>
                Track payment status
              </Button>
              <Button variant="outline" onClick={() => router.push("/transactions")}>
                View transactions
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Top up your wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="checkout-amount"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Amount (BWP)
                </label>
                <Input
                  id="checkout-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="checkout-phone"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Mobile money number (optional)
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <Input
                    id="checkout-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    placeholder="+267 7X XXX XXX"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="checkout-description"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Description (optional)
                </label>
                <Input
                  id="checkout-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Wallet top-up"
                />
              </div>
              <Button type="submit" isLoading={loading}>
                Start payment
              </Button>
              <p className="text-xs text-gray-500">
                Funds are credited only after the payment provider confirms the
                transaction. Track progress on the payment status page.
              </p>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}