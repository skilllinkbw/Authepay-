import Link from "next/link";
import Logo from "@/components/brand/logo";

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        <Link href="/" className="flex items-center">
          <Logo variant="web" />
        </Link>

        <nav className="hidden gap-8 text-sm font-medium text-gray-700 md:flex">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/transactions">Transactions</Link>
          <Link href="/wallet">Wallet</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#0B1F3A]"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="rounded-lg bg-[#0B1F3A] px-5 py-2 text-sm font-medium text-white"
          >
            Get Started
          </Link>
        </div>

      </div>
    </header>
  );
}
