"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { requiredSignupPolicies } from "@/lib/legal/policies";
import { Mail, Lock, User, Phone, ArrowRight } from "lucide-react";

const REQUIRED_LEGAL = requiredSignupPolicies();

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedLegal) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Profile + wallet are provisioned server-side by the handle_new_user
    // database trigger; the client never inserts financial rows directly.

    // Record legal acceptance server-side. If email confirmation is enabled
    // there may be no session yet — the dashboard PolicyGate will collect
    // acceptance on first sign-in in that case, so nothing is lost.
    try {
      for (const p of REQUIRED_LEGAL) {
        await fetch("/api/legal/acceptance", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ policy_id: p.id, policy_version: p.version }),
        });
      }
    } catch {
      // Non-fatal: PolicyGate enforces acceptance on first dashboard visit.
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-authepay-black">Create Account</h1>
            <p className="text-gray-500 mt-2">Start accepting payments with AuthePay</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="+267 76 749 821"
                  value={phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
              <input
                id="accept-legal"
                type="checkbox"
                checked={acceptedLegal}
                onChange={(e) => setAcceptedLegal(e.target.checked)}
                className="mt-1 h-4 w-4 accent-authepay-navy"
                required
              />
              <label htmlFor="accept-legal" className="text-sm text-gray-600">
                I have read and accept the{" "}
                {REQUIRED_LEGAL.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && " and "}
                    <Link
                      href={`/legal/${p.id}`}
                      target="_blank"
                      className="font-semibold text-authepay-blue hover:underline"
                    >
                      {p.title}
                    </Link>
                  </span>
                ))}
                .
              </label>
            </div>
            <Button type="submit" className="w-full" isLoading={loading}>
              Create Account
              <ArrowRight size={18} />
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-authepay-blue font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
