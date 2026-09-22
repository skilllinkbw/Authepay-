"use client";

/**
 * PolicyGate — blocks dashboard usage until the user has accepted the current
 * version of every required legal policy (Terms of Service, Privacy Policy).
 *
 * Enforcement model: this gate drives the UX; the authoritative record lives
 * in the append-only policy_acceptances table, written only by the server
 * after validating the policy id/version against the registry.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

interface RequiredPolicy {
  policy_id: string;
  version: string;
  title: string;
}

export function PolicyGate({ children }: { children: React.ReactNode }) {
  const [missing, setMissing] = useState<RequiredPolicy[]>([]);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/legal/acceptance");
      if (!res.ok) {
        // Fail open on transport/server errors so a misconfigured deployment
        // does not lock every user out; the server record remains the truth.
        setChecked(true);
        return;
      }
      const json = (await res.json()) as {
        data?: { missing?: RequiredPolicy[] };
      };
      setMissing(json.data?.missing ?? []);
      setChecked(true);
    } catch {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    // Initial fetch; state updates happen asynchronously after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const accept = async () => {
    setSubmitting(true);
    setError("");
    try {
      for (const p of missing) {
        const res = await fetch("/api/legal/acceptance", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ policy_id: p.policy_id, policy_version: p.version }),
        });
        if (!res.ok) {
          const json = (await res.json()) as { error?: { message?: string } };
          throw new Error(json.error?.message ?? "Could not record acceptance");
        }
      }
      setMissing([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record acceptance");
    } finally {
      setSubmitting(false);
    }
  };

  if (!checked) {
    return (
      <div className="flex items-center gap-3 p-8 text-gray-500">
        <Loader2 size={20} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (missing.length > 0) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck size={22} className="text-authepay-navy" />
            <h1 className="text-xl font-bold text-authepay-black">
              Review and accept to continue
            </h1>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Before using AuthePay you must accept the current version of the
            following documents. Your acceptance is recorded with a timestamp
            and the document version.
          </p>
          <ul className="mt-4 space-y-2">
            {missing.map((p) => (
              <li key={p.policy_id}>
                <Link
                  href={`/legal/${p.policy_id}`}
                  target="_blank"
                  className="text-sm font-semibold text-authepay-blue hover:underline"
                >
                  {p.title} (v{p.version})
                </Link>
              </li>
            ))}
          </ul>
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <Button
            type="button"
            className="mt-6 w-full"
            isLoading={submitting}
            onClick={accept}
          >
            I have read and accept these documents
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
