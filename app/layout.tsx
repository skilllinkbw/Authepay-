import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: {
    default: "AuthePay — Payments Infrastructure for Botswana",
    template: "%s — AuthePay",
  },
  description:
    "AuthePay provides payment APIs, digital wallets, and merchant payment tools for businesses in Botswana, with enforced access controls and an auditable transaction ledger.",
  applicationName: "AuthePay",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    siteName: "AuthePay",
    title: "AuthePay — Payments Infrastructure for Botswana",
    description:
      "Secure payment APIs, digital wallets, and merchant tools for Botswana businesses.",
    type: "website",
    images: ["/assets/logo-web.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
