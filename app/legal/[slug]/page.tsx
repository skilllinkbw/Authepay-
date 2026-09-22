import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { POLICIES, getPolicy } from "@/lib/legal/policies";

export function generateStaticParams() {
  return POLICIES.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) return {};
  return { title: policy.title, description: policy.summary };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/legal"
        className="text-sm font-medium text-authepay-blue hover:underline"
      >
        &larr; All legal documents
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
        {policy.title}
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Version {policy.version} &middot; last updated {policy.lastUpdated}
      </p>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        This document is a draft pending independent legal review and does not
        constitute legal advice or assert any regulatory approval.
      </div>
      <article className="mt-10 space-y-8">
        {policy.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold text-gray-900">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed text-gray-700">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
