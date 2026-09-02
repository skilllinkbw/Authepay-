"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Clock, Receipt, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaymentStatusResponse {
  data?: {
    transaction?: Record<string, unknown>;
    payment?: Record<string, unknown>;
  };
  error?: { message?: string };
}

type Status = "succeeded" | "failed" | "cancelled" | "pending" | "processing" | "refunded";

/**
 * Payment status page — polls the REAL payment API for the given reference and
 * renders success only when the backend confirms `succeeded`. All other states
 * are shown explicitly; a payment is never assumed to have succeeded.
 */
export default function PaymentStatusPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const [reference, setReference] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const terminalRef = useRef(false);

  useEffect(() => {
    void params.then(({ reference: ref }) => setReference(ref));
  }, [params]);

  const load = useCallback(async () => {
    if (!reference) return;
    try {
      const res = await fetch(`/api/payments/${reference}`, { cache: "no-store" });
      const json = (await res.json()) as PaymentStatusResponse;
      if (!res.ok) {
        setError(json.error?.message ?? "Could not load payment");
        terminalRef.current = true;
        setLoading(false);
        return;
      }
      const txn = json.data?.transaction;
      const intent = json.data?.payment;
      const s = (txn?.status as Status) ?? (intent?.status as Status) ?? null;
      setStatus(s);
      if (s === "succeeded" || s === "failed" || s === "cancelled" || s === "refunded") {
        terminalRef.current = true;
      }
      setLoading(false);
    } catch {
      setError("Network error - could not reach the payments service.");
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    terminalRef.current = false;
    // Initial + polled fetch; state updates happen asynchronously after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = setInterval(() => {
      if (!terminalRef.current) void load();
      else clearInterval(timer);
    }, 5_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  const settled = status === "succeeded" || status === "refunded";

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-authepay-black">
        <Receipt size={22} /> Payment
      </h1>

      <Card>
        <CardContent className="p-8">
          <p className="mb-4 font-mono text-sm text-gray-500">{reference}</p>

          {loading ? (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 size={20} className="animate-spin" /> Checking payment status…
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600">
              <AlertTriangle size={18} /> <span>{error}</span>
            </div>
          ) : status === "succeeded" ? (
            <div className="rounded-xl bg-green-50 p-4 text-authepay-green">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={20} /> Payment successful
              </div>
              <p className="mt-1 text-sm">
                Your wallet has been credited. Funds will appear on your
                dashboard and transaction history.
              </p>
            </div>
          ) : status === "refunded" ? (
            <div className="rounded-xl bg-blue-50 p-4 text-blue-700">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={20} /> Payment refunded
              </div>
              <p className="mt-1 text-sm">
                This payment was fully refunded to the originating account.
              </p>
            </div>
          ) : status === "failed" || status === "cancelled" ? (
            <div className="rounded-xl bg-red-50 p-4 text-red-600">
              <div className="flex items-center gap-2 font-semibold">
                <XCircle size={20} /> Payment failed
              </div>
              <p className="mt-1 text-sm">
                No money was moved. You can start a new payment from the
                checkout page.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-yellow-50 p-4 text-yellow-800">
              <div className="flex items-center gap-2 font-semibold">
                <Clock size={20} /> Payment pending
              </div>
              <p className="mt-1 text-sm">
                Waiting for the provider to confirm this payment. This page
                refreshes automatically. We will only mark the payment complete
                once the provider confirms it.
              </p>
            </div>
          )}

          {settled && (
            <div className="mt-6 flex gap-3">
              <Link href="/transactions">
                <Button variant="outline">View transactions</Button>
              </Link>
              <Link href="/dashboard">
                <Button>Go to dashboard</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}