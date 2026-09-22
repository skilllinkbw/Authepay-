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

      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-8 text-sm text-gray-500 md:flex-row md:justify-between">
          <p>&copy; {new Date().getFullYear()} AuthePay. Botswana.</p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/legal/terms-of-service" className="hover:text-gray-900">Terms</Link>
            <Link href="/legal/privacy-policy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/legal/acceptable-use" className="hover:text-gray-900">Acceptable Use</Link>
            <Link href="/legal/merchant-terms" className="hover:text-gray-900">Merchants</Link>
            <Link href="/legal/api-terms" className="hover:text-gray-900">API</Link>
            <Link href="/legal" className="hover:text-gray-900">All legal</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
