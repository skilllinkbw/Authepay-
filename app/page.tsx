import Logo from "@/components/brand/logo";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">

        <Logo variant="web" />

        <h1 className="mt-10 max-w-4xl text-5xl font-bold tracking-tight text-gray-900">
          Payments infrastructure built for Africa
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-600">
          AuthePay provides secure payment APIs, digital wallets,
          merchant solutions and financial infrastructure for businesses.
        </p>

        <div className="mt-10 flex gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-[#0B1F3A] px-6 py-3 text-white hover:opacity-90"
          >
            Start Building
          </Link>

          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-6 py-3 text-[#0B1F3A] hover:bg-gray-50"
          >
            Explore Platform
          </Link>
        </div>

      </section>
    </main>
  );
}
