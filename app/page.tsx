import Logo from "@/components/brand/logo";

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
          <button className="rounded-lg bg-[#0B1F3A] px-6 py-3 text-white">
            Start Building
          </button>

          <button className="rounded-lg border border-gray-300 px-6 py-3 text-[#0B1F3A]">
            Explore Platform
          </button>
        </div>

      </section>
    </main>
  );
}
