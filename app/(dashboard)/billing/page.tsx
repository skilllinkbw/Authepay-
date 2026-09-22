"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BadgeCheck, CreditCard, Loader2 } from "lucide-react";
import { fromMinor } from "@/lib/money";

interface BillingData {
  subscription: {
    plan: string;
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
  };
  plan: {
    id: string;
    name: string;
    description: string;
    features: string[];
    limits: {
      api_keys_max: number;
      monthly_payment_volume_minor: number | null;
    };
    price_bwp_minor_per_month: number | null;
  };
  trial_days_remaining: number;
  usage: {
    active_api_keys: number;
    monthly_payment_volume_minor: number;
  };
}

const STATUS_STYLES: Record<string, string> = {
  trialing: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  past_due: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/billing");
      const json = (await res.json()) as {
        data?: BillingData;
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        setError(json.error?.message ?? "Could not load billing information");
        return;
      }
      setData(json.data);
    } catch {
      setError("Network error - could not load billing information");
    }
  }, []);

  useEffect(() => {
    // Initial fetch; state updates happen asynchronously after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600 max-w-xl">
        <AlertTriangle size={18} /> <span>{error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-3 text-gray-500">
        <Loader2 size={20} className="animate-spin" /> Loading plan…
      </div>
    );
  }

  const { subscription, plan, usage } = data;
  const volumeCap = plan.limits.monthly_payment_volume_minor;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-authepay-black">Plan &amp; Billing</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard size={18} /> {plan.name} plan
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[subscription.status] ?? "bg-gray-100 text-gray-600"}`}
            >
              {subscription.status.replace("_", " ")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{plan.description}</p>

          {subscription.status === "trialing" && (
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
              {data.trial_days_remaining > 0
                ? `${data.trial_days_remaining} day(s) remaining in your trial.`
                : "Your trial has expired."}
            </div>
          )}
          {subscription.status === "suspended" && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              Your account is suspended. Payments and API key creation are
              unavailable. Contact support to resolve this.
            </div>
          )}

          <ul className="space-y-1">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <BadgeCheck size={15} className="text-authepay-green" /> {f}
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-gray-200 p-4 text-sm">
            <p className="font-semibold text-gray-900">Pricing</p>
            <p className="mt-1 text-gray-600">
              {plan.price_bwp_minor_per_month === null
                ? "Commercial pricing is being finalised. You will be notified before any charge applies, and no card is required while pricing is unpublished."
                : `P${fromMinor(plan.price_bwp_minor_per_month, "BWP")} / month`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage this period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Active API keys</span>
            <span className="font-medium text-gray-900">
              {usage.active_api_keys} / {plan.limits.api_keys_max}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Collected volume (BWP, this month)</span>
            <span className="font-medium text-gray-900">
              P{fromMinor(usage.monthly_payment_volume_minor, "BWP")}
              {volumeCap !== null && ` / P${fromMinor(volumeCap, "BWP")}`}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <p>
            Plan upgrades, downgrades, and cancellations are handled by the
            AuthePay team while self-serve billing is being finalised. Contact
            support and include your account email. Changes are applied by an
            administrator and recorded in the audit log.
          </p>
          <p className="mt-3">
            Review the{" "}
            <Link href="/legal/terms-of-service" className="text-authepay-blue hover:underline">
              Terms of Service
            </Link>{" "}
            for subscription, suspension, and cancellation terms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
