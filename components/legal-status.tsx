"use client";

/**
 * LegalStatus — shows the user's recorded policy acceptances and links to
 * every current legal document. Read-only display; acceptance changes are
 * driven by the dashboard PolicyGate.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck2 } from "lucide-react";
import { POLICIES, policyPath } from "@/lib/legal/policies";

interface Acceptance {
  policy_id: string;
  policy_version: string;
  accepted_at: string;
}

export function LegalStatus() {
  const [acceptances, setAcceptances] = useState<Acceptance[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/legal/acceptance")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        const list = (json as { data?: { acceptances?: Acceptance[] } } | null)
          ?.data?.acceptances;
        setAcceptances(list ?? []);
      })
      .catch(() => {
        if (!cancelled) setAcceptances([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 size={18} /> Legal &amp; compliance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {POLICIES.map((p) => {
            const accepted = acceptances?.find(
              (a) => a.policy_id === p.id && a.policy_version === p.version
            );
            return (
              <li key={p.id} className="flex items-center justify-between gap-4">
                <Link
                  href={policyPath(p)}
                  className="font-medium text-authepay-blue hover:underline"
                >
                  {p.title}
                </Link>
                <span className="text-xs text-gray-500">
                  {accepted
                    ? `Accepted v${accepted.policy_version} on ${new Date(accepted.accepted_at).toLocaleDateString()}`
                    : `v${p.version} — not accepted`}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-gray-500">
          Documents are drafts pending independent legal review. Acceptance
          records are stored with a timestamp and document version and cannot
          be edited after recording.
        </p>
      </CardContent>
    </Card>
  );
}
