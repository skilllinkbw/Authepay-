import Link from "next/link";
import type { Metadata } from "next";
import { POLICIES, policyPath } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Legal",
  description: "AuthePay legal and compliance documents.",
};

export default function LegalIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Legal &amp; Compliance
      </h1>
      <p className="mt-3 text-gray-600">
        The documents below govern the use of AuthePay. They are currently in
        draft and pending independent legal review by a Botswana-qualified
        attorney; they do not assert any licence, certification, or regulatory
        approval.
      </p>
      <ul className="mt-10 space-y-4">
        {POLICIES.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-authepay-navy"
          >
            <Link href={policyPath(p)} className="block">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-authepay-navy">
                  {p.title}
                </h2>
                <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  v{p.version} · draft
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{p.summary}</p>
              <p className="mt-2 text-xs text-gray-400">
                Last updated {p.lastUpdated}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
